/**
 * HMM PTP Schedule Adapter
 * Implements ScheduleAdapter for HMM's Point-to-Point Schedule API
 */

import { ScheduleAdapter } from '@adapters/carriers/base/ScheduleAdapter';
import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { mapHMMPTPScheduleToDCSA } from './mappers/ptpScheduleMapper';

/**
 * HMM PTP Schedule API Response Structure
 */
interface HMMPTPScheduleResponse {
  resultData?: Array<{
    globaRouteMapNo?: string;
    loadingPortName?: string;
    loadingPortCode?: string;
    loadingTerminalName?: string;
    loadingTerminalCode?: string;
    vesselOperatorName?: string;
    departureDate?: string;
    transshipPortName?: string;
    transshipPortCode?: string;
    transshipTerminalName?: string;
    transshipTerminalCode?: string;
    arrivalDate?: string;
    transshipVesselCode?: string;
    dischargePortName?: string;
    dischargePortCode?: string;
    dischargeTerminalName?: string;
    dischargeTerminalCode?: string;
    totalTransitDay?: number;
    porFacilityName?: string;
    porFacilityCode?: string;
    deliveryFacilityName?: string;
    deliveryFaciltyCode?: string;
    inlandCutOffTime?: string;
    cargoCutOffTime?: string;
    vessel?: Array<{
      vesselSequence?: number;
      vesselName?: string;
      vesselCode?: string;
      voyageNumber?: string;
      vesselLoop?: string;
      loadPort?: string;
      dischargePort?: string;
      vesselDepartureDate?: string;
      vesselArrivalDate?: string;
    }>;
  }>;
  resultCode?: string;
  resultMessage?: string;
}

/**
 * HMM PTP Schedule Adapter
 * Proprietary API - requires mapper for transformation
 */
export class HMMPTPScheduleAdapter implements ScheduleAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'HMM';

  constructor() {
    this.config = ConfigLoader.loadCarrierConfig(this.carrierCode);
    this.httpClient = new HttpClient(this.carrierCode, this.config);
  }

  /**
   * Get point-to-point schedules
   * @param params Query parameters
   * @returns Array of service schedules
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
    const endpoint = this.config.apis.ptpSchedule?.endpoint;
    if (!endpoint) {
      throw new Error('PTP Schedule API endpoint not configured for HMM');
    }

    // HMM PTP Schedule API requires specific parameters
    // We'll use custom query parameters that map to HMM's API
    // fromLocationCode, toLocationCode, periodDate, weekTerm are required
    
    // Extract from custom fields or use standard fields
    const fromLocationCode = (params as any).fromLocationCode || params.UNLocationCode;
    const toLocationCode = (params as any).toLocationCode;
    const periodDate = (params as any).periodDate || params.startDate;
    const weekTerm = (params as any).weekTerm || '2';
    const receiveTermCode = (params as any).receiveTermCode || 'CY';
    const deliveryTermCode = (params as any).deliveryTermCode || 'CY';
    const webSort = (params as any).webSort || 'D';
    const webPriority = (params as any).webPriority || 'A';

    if (!fromLocationCode) {
      throw new Error('HMM PTP Schedule API requires fromLocationCode parameter');
    }

    if (!toLocationCode) {
      throw new Error('HMM PTP Schedule API requires toLocationCode parameter');
    }

    if (!periodDate) {
      throw new Error('HMM PTP Schedule API requires periodDate parameter');
    }

    // Convert ISO date (YYYY-MM-DD) to HMM format (YYYYMMDD)
    const hmmPeriodDate = convertToHMMDateFormat(periodDate);

    // Build query parameters
    const queryParams: Record<string, string> = {
      fromLocationCode: fromLocationCode,
      receiveTermCode: receiveTermCode,
      toLocationCode: toLocationCode,
      deliveryTermCode: deliveryTermCode,
      periodDate: hmmPeriodDate,
      weekTerm: weekTerm,
    };

    // Add optional parameters
    if (webSort) {
      queryParams.webSort = webSort;
    }
    if (webPriority) {
      queryParams.webPriority = webPriority;
    }

    // Build request body (can contain the same parameters)
    const requestBody: Record<string, any> = {
      fromLocationCode: fromLocationCode,
      receiveTermCode: receiveTermCode,
      toLocationCode: toLocationCode,
      deliveryTermCode: deliveryTermCode,
      periodDate: hmmPeriodDate,
      weekTerm: weekTerm,
    };

    if (webSort) {
      requestBody.webSort = webSort;
    }
    if (webPriority) {
      requestBody.webPriority = webPriority;
    }

    try {
      // HMM uses POST method with body and query parameters
      const response = await this.httpClient.post<HMMPTPScheduleResponse>(
        endpoint,
        requestBody,
        {
          params: queryParams,
        }
      );

      // Check for errors in response
      if (response.resultCode && response.resultCode !== 'Success') {
        throw new Error(
          `HMM PTP Schedule API error: ${response.resultCode} - ${response.resultMessage || 'Unknown error'}`
        );
      }

      // Map HMM response to DCSA format
      return mapHMMPTPScheduleToDCSA(response, fromLocationCode, toLocationCode);
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response.data;
        if (errorData?.errors) {
          throw new Error(
            `HMM PTP Schedule API error: ${errorData.statusCode || error.response.status} ` +
            `${errorData.statusCodeText || error.response.statusText} - ` +
            `${errorData.errors.reason || 'Unknown error'}: ${errorData.errors.message || ''}`
          );
        }
        throw new Error(
          `HMM PTP Schedule API error: ${error.response.status} ${error.response.statusText} - ` +
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

