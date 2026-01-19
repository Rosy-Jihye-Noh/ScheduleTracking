/**
 * HMM Schedule Adapter
 * Implements ScheduleAdapter for HMM's proprietary Schedule API
 */

import { ScheduleAdapter } from '@adapters/carriers/base/ScheduleAdapter';
import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { mapHMMScheduleToDCSA } from './mappers/scheduleMapper';

/**
 * HMM Schedule API Response Structure
 */
interface HMMScheduleResponse {
  resultData?: Array<{
    vvdCode?: string;
    portCode?: string;
    portName?: string;
    tmnlCode?: string;
    tmnlName?: string;
    vesselName?: string;
    scheduleDirectionCode?: string;
    longTermDeparture?: {
      longTermDate?: string;
      longTermTime?: string;
    };
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
 * HMM Schedule Adapter
 * Proprietary API - requires mapper for transformation
 */
export class HMMScheduleAdapter implements ScheduleAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'HMM';

  constructor() {
    this.config = ConfigLoader.loadCarrierConfig(this.carrierCode);
    this.httpClient = new HttpClient(this.carrierCode, this.config);
  }

  /**
   * Get vessel schedules
   * @param params Query parameters
   * @returns Array of service schedules
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
    const endpoint = this.config.apis.schedule?.endpoint;
    if (!endpoint) {
      throw new Error('Schedule API endpoint not configured for HMM');
    }

    // HMM API requires vvdCode (carrierVoyageNumber) as a required parameter
    // If not provided, we cannot make the request
    if (!params.carrierVoyageNumber) {
      throw new Error('HMM Schedule API requires carrierVoyageNumber (vvdCode) parameter');
    }

    // Build request body for POST request
    const requestBody: Record<string, any> = {
      vvdCode: params.carrierVoyageNumber,
    };

    // Add optional query parameters
    const queryParams: Record<string, string> = {};
    if (params.carrierVoyageNumber) {
      queryParams.vvdCode = params.carrierVoyageNumber;
    }

    try {
      // HMM uses POST method with body and query parameters
      const response = await this.httpClient.post<HMMScheduleResponse>(
        endpoint,
        requestBody,
        {
          params: queryParams,
        }
      );

      // Check for errors in response
      if (response.resultCode && response.resultCode !== 'Success') {
        throw new Error(
          `HMM Schedule API error: ${response.resultCode} - ${response.resultMessage || 'Unknown error'}`
        );
      }

      // Map HMM response to DCSA format
      return mapHMMScheduleToDCSA(response, params.carrierServiceCode);
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response.data;
        if (errorData?.errors) {
          throw new Error(
            `HMM Schedule API error: ${errorData.statusCode || error.response.status} ` +
            `${errorData.statusCodeText || error.response.statusText} - ` +
            `${errorData.errors.reason || 'Unknown error'}: ${errorData.errors.message || ''}`
          );
        }
        throw new Error(
          `HMM Schedule API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }
}

