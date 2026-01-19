/**
 * Maersk Schedule Adapter
 * Implements ScheduleAdapter for Maersk's DCSA-compliant Schedule API
 */

import { ScheduleAdapter } from '@adapters/carriers/base/ScheduleAdapter';
import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';

/**
 * Maersk Schedule Adapter
 * DCSA standard API - direct mapping with minimal transformation
 */
export class MaerskScheduleAdapter implements ScheduleAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'MAERSK';

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
      throw new Error('Schedule API endpoint not configured for Maersk');
    }

    // Validate date range: Maersk API requires dates within 90 days past and 180 days future
    if (params.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(params.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() - 90);
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 180);
      
      if (startDate < minDate || startDate > maxDate) {
        throw new Error(
          `Maersk Vessel Schedule API: Start Date must be within 90 days past and 180 days future from today. ` +
          `Received: ${params.startDate}, Valid range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`
        );
      }
    }

    if (params.endDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(params.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() - 90);
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 180);
      
      if (endDate < minDate || endDate > maxDate) {
        throw new Error(
          `Maersk Vessel Schedule API: End Date must be within 90 days past and 180 days future from today. ` +
          `Received: ${params.endDate}, Valid range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`
        );
      }
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
          `Maersk Schedule API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }
}

