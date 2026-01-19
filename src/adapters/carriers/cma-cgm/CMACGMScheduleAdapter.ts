/**
 * CMA CGM Schedule Adapter
 * Implements ScheduleAdapter for CMA CGM's DCSA-compliant Schedule API
 */

import { ScheduleAdapter } from '@adapters/carriers/base/ScheduleAdapter';
import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';

/**
 * CMA CGM Schedule Adapter
 * DCSA standard API - direct mapping with minimal transformation
 */
export class CMACGMScheduleAdapter implements ScheduleAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'CMCG';

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
      throw new Error('Schedule API endpoint not configured for CMA CGM');
    }

    // Build query parameters
    const queryParams: Record<string, string> = {};

    if (params.vesselIMONumber) {
      queryParams.vesselIMONumber = params.vesselIMONumber;
    }
    if (params.vesselName) {
      queryParams.vesselName = params.vesselName;
    }
    if (params.carrierServiceCode) {
      queryParams.carrierServiceCode = params.carrierServiceCode;
    }
    if (params.universalServiceReference) {
      queryParams.universalServiceReference = params.universalServiceReference;
    }
    if (params.carrierVoyageNumber) {
      queryParams.carrierVoyageNumber = params.carrierVoyageNumber;
    }
    if (params.universalVoyageReference) {
      queryParams.universalVoyageReference = params.universalVoyageReference;
    }
    if (params.UNLocationCode) {
      queryParams.UNLocationCode = params.UNLocationCode;
    }
    if (params.facilitySMDGCode) {
      queryParams.facilitySMDGCode = params.facilitySMDGCode;
    }
    if (params.vesselOperatorCarrierCode) {
      queryParams.vesselOperatorCarrierCode = params.vesselOperatorCarrierCode;
    }
    if (params.startDate) {
      queryParams.startDate = params.startDate;
    }
    if (params.endDate) {
      queryParams.endDate = params.endDate;
    }
    if (params.limit) {
      queryParams.limit = params.limit.toString();
    }
    if (params.cursor) {
      queryParams.cursor = params.cursor;
    }

    // Add API-Version header if needed
    const headers: Record<string, string> = {};
    if (this.config.apis.schedule?.version) {
      const majorVersion = this.config.apis.schedule.version.split('.')[0];
      headers['API-Version'] = majorVersion;
    }

    try {
      // DCSA standard API - response is already in the correct format
      const response = await this.httpClient.get<ServiceSchedule[]>(endpoint, {
        params: queryParams,
        headers: headers,
      });

      return response;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `CMA CGM Schedule API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }
}

