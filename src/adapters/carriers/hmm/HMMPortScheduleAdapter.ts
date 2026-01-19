/**
 * HMM Port Schedule Adapter
 * Implements ScheduleAdapter for HMM's Port Schedule API
 */

import { ScheduleAdapter } from '@adapters/carriers/base/ScheduleAdapter';
import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { mapHMMScheduleToDCSA } from './mappers/scheduleMapper';

/**
 * HMM Port Schedule API Response Structure
 * (Same structure as Vessel Schedule, but may have additional fields)
 */
interface HMMPortScheduleResponse {
  resultData?: Array<{
    vvdCode?: string;
    portCode?: string;
    portName?: string;
    tmnlCode?: string;
    tmnlName?: string;
    vesselName?: string;
    vesselServiceLoopCode?: string;
    vesselCode?: string;
    scheduleVoyageNo?: string;
    scheduleDirectionCode?: string;
    arrival?: {
      arrivalDate?: string;
      arrivalTime?: string;
      arrivalStatusCode?: string;
    };
    berthing?: {
      berthingDate?: string;
      berthingTime?: string;
      berthingStatusCode?: string;
    };
    departure?: {
      departureDate?: string;
      departureTime?: string;
      departureStatusCode?: string;
    };
  }>;
  resultCode?: string;
  resultMessage?: string;
}

/**
 * HMM Port Schedule Adapter
 * Proprietary API - uses same mapper as Vessel Schedule
 */
export class HMMPortScheduleAdapter implements ScheduleAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'HMM';

  constructor() {
    this.config = ConfigLoader.loadCarrierConfig(this.carrierCode);
    this.httpClient = new HttpClient(this.carrierCode, this.config);
  }

  /**
   * Get port schedules
   * @param params Query parameters
   * @returns Array of service schedules
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
    const endpoint = this.config.apis.portSchedule?.endpoint;
    if (!endpoint) {
      throw new Error('Port Schedule API endpoint not configured for HMM');
    }

    // HMM Port Schedule API requires portCode, startDate, endDate
    if (!params.UNLocationCode) {
      throw new Error('HMM Port Schedule API requires UNLocationCode (portCode) parameter');
    }

    if (!params.startDate) {
      throw new Error('HMM Port Schedule API requires startDate (durationFrom) parameter');
    }

    if (!params.endDate) {
      throw new Error('HMM Port Schedule API requires endDate (durationTo) parameter');
    }

    // Convert ISO date (YYYY-MM-DD) to HMM format (YYYYMMDD)
    const durationFrom = convertToHMMDateFormat(params.startDate);
    const durationTo = convertToHMMDateFormat(params.endDate);

    // Build query parameters
    const queryParams: Record<string, string> = {
      portCode: params.UNLocationCode,
      durationFrom: durationFrom,
      durationTo: durationTo,
    };

    // Add optional parameter
    if (params.vesselOperatorCarrierCode) {
      // optionVessel: 1 = Including Feeder Vessel, 2 = Mother Vessel Only
      queryParams.optionVessel = params.vesselOperatorCarrierCode;
    }

    // Build request body (can be empty or contain the same parameters)
    const requestBody: Record<string, any> = {
      portCode: params.UNLocationCode,
      durationFrom: durationFrom,
      durationTo: durationTo,
    };

    if (params.vesselOperatorCarrierCode) {
      requestBody.optionVessel = params.vesselOperatorCarrierCode;
    }

    try {
      // HMM uses POST method with body and query parameters
      const response = await this.httpClient.post<HMMPortScheduleResponse>(
        endpoint,
        requestBody,
        {
          params: queryParams,
        }
      );

      // Check for errors in response
      if (response.resultCode && response.resultCode !== 'Success') {
        throw new Error(
          `HMM Port Schedule API error: ${response.resultCode} - ${response.resultMessage || 'Unknown error'}`
        );
      }

      // Map HMM response to DCSA format (same mapper as Vessel Schedule)
      return mapHMMScheduleToDCSA(response, params.carrierServiceCode);
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response.data;
        if (errorData?.errors) {
          throw new Error(
            `HMM Port Schedule API error: ${errorData.statusCode || error.response.status} ` +
            `${errorData.statusCodeText || error.response.statusText} - ` +
            `${errorData.errors.reason || 'Unknown error'}: ${errorData.errors.message || ''}`
          );
        }
        throw new Error(
          `HMM Port Schedule API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }
}

/**
 * Convert ISO date format (YYYY-MM-DD) to HMM format (YYYYMMDD)
 * @param dateStr ISO date string
 * @returns HMM date format string
 */
function convertToHMMDateFormat(dateStr: string): string {
  // Remove dashes and time part if present
  return dateStr.replace(/[-T:]/g, '').substring(0, 8);
}

