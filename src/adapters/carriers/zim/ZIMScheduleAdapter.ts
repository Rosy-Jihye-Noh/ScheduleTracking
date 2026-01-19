/**
 * ZIM Schedule Adapter
 * Implements ScheduleAdapter for ZIM's proprietary Point-to-Point Schedule API
 */

import { ScheduleAdapter } from '@adapters/carriers/base/ScheduleAdapter';
import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { mapZIMScheduleToDCSA } from './mappers/scheduleMapper';

/**
 * ZIM Schedule API Response Structure
 */
interface ZIMScheduleResponse {
  response?: {
    routes?: Array<{
      routeSequence?: number;
      departurePort?: string;
      departurePortName?: string;
      departureDate?: string;
      arrivalPort?: string;
      arrivalPortName?: string;
      arrivalDate?: string;
      transitTime?: number;
      routeLegCount?: number;
      routeLegs?: Array<{
        legOrder?: number;
        line?: string;
        departurePort?: string;
        departurePortName?: string;
        arrivalPort?: string;
        arrivalPortName?: string;
        departureDate?: string;
        arrivalDate?: string;
        vesselName?: string;
        vesselCode?: string;
        lloydsCode?: string;
        callSign?: string;
        voyage?: string;
        leg?: string;
        consortSailingNumber?: string;
        docClosingDate?: string;
        containerClosingDate?: string;
        vgmClosingDate?: string;
        firstGateInDate?: string;
        amsClosingDate?: string;
        usDocClosingDate?: string;
        reeferEntryPortCutOffDate?: string;
        hazardousDocsCutOff?: string;
        depotFrom?: string;
        depotTo?: string;
      }>;
    }>;
  };
}

/**
 * ZIM Schedule Adapter
 * Proprietary API - requires mapper for transformation
 * Note: ZIM only provides Point-to-Point schedules, not full vessel schedules
 */
export class ZIMScheduleAdapter implements ScheduleAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'ZIM';

  constructor() {
    this.config = ConfigLoader.loadCarrierConfig(this.carrierCode);
    this.httpClient = new HttpClient(this.carrierCode, this.config);
  }

  /**
   * Get vessel schedules
   * Note: ZIM only supports Point-to-Point queries, so we need origin and destination
   * @param params Query parameters
   * @returns Array of service schedules
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
    const endpoint = this.config.apis.schedule?.endpoint;
    if (!endpoint) {
      throw new Error('Schedule API endpoint not configured for ZIM');
    }

    // ZIM API requires originCode and destCode (UNLocationCode)
    // We can use UNLocationCode from params, but ZIM needs both origin and destination
    // For now, we'll require the user to provide both via a workaround
    // In a real implementation, we might need to extend ScheduleQueryParams to include origin/destination

    // Build query parameters for ZIM Point-to-Point API
    const queryParams: Record<string, string> = {};

    // ZIM requires originCode and destCode
    // We'll try to extract from UNLocationCode or require both
    // For simplicity, we'll use UNLocationCode as both if only one is provided
    // In production, you'd want to handle this differently
    if (params.UNLocationCode) {
      // If only one location is provided, we can't make a proper P2P query
      // This is a limitation of ZIM's API - it only supports Point-to-Point
      throw new Error(
        'ZIM Schedule API requires both origin and destination locations. ' +
        'Please provide originCode and destCode via extended query parameters.'
      );
    }

    // For ZIM, we need to map our generic params to ZIM-specific params
    // This is a simplified version - in production you'd want a better mapping
    if (params.startDate) {
      queryParams.fromDate = params.startDate;
    }
    if (params.endDate) {
      queryParams.toDate = params.endDate;
    }

    // ZIM requires sortByDepartureOrArrival
    queryParams.sortByDepartureOrArrival = 'Departure'; // Default to Departure

    try {
      // Note: This is a simplified implementation
      // In production, you'd need to handle the origin/destination requirement properly
      const response = await this.httpClient.get<ZIMScheduleResponse>(endpoint, {
        params: queryParams,
      });

      // Map ZIM response to DCSA format
      return mapZIMScheduleToDCSA(response);
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `ZIM Schedule API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }
}

