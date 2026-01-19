/**
 * Maersk Port Schedule Adapter
 * Implements ScheduleAdapter for Maersk's DCSA Port Schedule API
 */

import { ScheduleAdapter } from '@adapters/carriers/base/ScheduleAdapter';
import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { Logger } from '@infrastructure/logger/Logger';

/**
 * Maersk Port Schedule API Response Types (DCSA Standard)
 */
interface MaerskPortSchedule {
  location: {
    locationName?: string;
    UNLocationCode?: string;
    facilitySMDGCode?: string;
  };
  vesselSchedules: Array<{
    universalServiceReference?: string;
    servicePartners: Array<{
      carrierCode?: string;
      carrierCodeListProvider?: 'SMDG' | 'NMFTA';
      carrierServiceName: string;
      carrierServiceCode: string;
      carrierImportVoyageNumber: string;
      carrierExportVoyageNumber: string;
    }>;
    vessel?: {
      vesselIMONumber: string;
      MMSINumber?: string;
      name: string;
      flag?: string;
      callSign?: string;
      operatorCarrierCode?: string;
      operatorCarrierCodeListProvider?: 'SMDG' | 'NMFTA';
    };
    isDummyVessel: boolean;
    universalImportVoyageReference?: string;
    universalExportVoyageReference?: string;
    timestamps: Array<{
      eventTypeCode: 'ARRI' | 'DEPA';
      eventClassifierCode: 'ACT' | 'EST' | 'PLN';
      eventDateTime: string;
    }>;
    cutOffTimes?: Array<{
      cutOffDateTimeCode: string;
      cutOffDateTime: string;
    }>;
  }>;
}

/**
 * Maersk Port Schedule Adapter
 * DCSA standard API - maps PortSchedule[] to ServiceSchedule[]
 */
export class MaerskPortScheduleAdapter implements ScheduleAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'MAERSK';

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
      throw new Error('Port Schedule API endpoint not configured for Maersk');
    }

    // Required parameters
    if (!params.UNLocationCode) {
      throw new Error('Maersk Port Schedule API requires UNLocationCode parameter');
    }
    
    // date parameter (required) - use startDate or current date
    const date = (params as any).date || params.startDate || new Date().toISOString().split('T')[0];

    // Build query parameters
    const queryParams: Record<string, string> = {
      UNLocationCode: params.UNLocationCode,
      date: date,
    };

    if (params.limit) {
      queryParams.limit = params.limit.toString();
    }
    if (params.cursor) {
      queryParams.cursor = params.cursor;
    }

    // Add API-Version header if needed
    const headers: Record<string, string> = {};
    if (this.config.apis.portSchedule?.version) {
      const majorVersion = this.config.apis.portSchedule.version.split('.')[0];
      headers['API-Version'] = majorVersion;
    }

    try {
      Logger.info(`Maersk Port Schedule: Getting schedules`, {
        carrier: this.carrierCode,
        UNLocationCode: params.UNLocationCode,
        date,
        endpoint,
      });

      // DCSA standard API - response is PortSchedule[]
      const response = await this.httpClient.get<MaerskPortSchedule[]>(endpoint, {
        params: queryParams,
        headers: headers,
      });

      // Map PortSchedule[] to ServiceSchedule[]
      return this.mapPortScheduleToDCSA(response);
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Maersk Port Schedule API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }

  /**
   * Map Maersk Port Schedule response to DCSA ServiceSchedule format
   * Groups schedules by service and creates ServiceSchedule entries
   */
  private mapPortScheduleToDCSA(portSchedules: MaerskPortSchedule[]): ServiceSchedule[] {
    const serviceMap = new Map<string, ServiceSchedule>();

    for (const portSchedule of portSchedules) {
      for (const vesselSchedule of portSchedule.vesselSchedules) {
        // Get service code from servicePartners
        const servicePartner = vesselSchedule.servicePartners?.[0];
        if (!servicePartner) {
          continue;
        }

        const serviceCode = servicePartner.carrierServiceCode;
        const serviceName = servicePartner.carrierServiceName;

        if (!serviceMap.has(serviceCode)) {
          serviceMap.set(serviceCode, {
            carrierServiceCode: serviceCode,
            carrierServiceName: serviceName,
            universalServiceReference: vesselSchedule.universalServiceReference,
            vesselSchedules: [],
          });
        }

        const schedule = serviceMap.get(serviceCode)!;
        const vesselIMO = vesselSchedule.vessel?.vesselIMONumber || '0000000';

        // Find or create vessel schedule
        let vs = schedule.vesselSchedules.find(
          (v) => v.vessel?.vesselIMONumber === vesselIMO
        );

        if (!vs) {
          vs = {
            isDummyVessel: vesselSchedule.isDummyVessel,
            vessel: vesselSchedule.vessel ? {
              vesselIMONumber: vesselSchedule.vessel.vesselIMONumber,
              name: vesselSchedule.vessel.name,
              MMSINumber: vesselSchedule.vessel.MMSINumber,
              flag: vesselSchedule.vessel.flag,
              callSign: vesselSchedule.vessel.callSign,
              operatorCarrierCode: vesselSchedule.vessel.operatorCarrierCode,
              operatorCarrierCodeListProvider: vesselSchedule.vessel.operatorCarrierCodeListProvider,
            } : undefined,
            transportCalls: [],
          };
          schedule.vesselSchedules.push(vs);
        }

        // Add transport call from port schedule
        const transportCall = {
          transportCallReference: `port-${portSchedule.location.UNLocationCode}-${vesselSchedule.servicePartners[0].carrierExportVoyageNumber}`,
          carrierImportVoyageNumber: vesselSchedule.servicePartners[0].carrierImportVoyageNumber,
          carrierExportVoyageNumber: vesselSchedule.servicePartners[0].carrierExportVoyageNumber,
          universalImportVoyageReference: vesselSchedule.universalImportVoyageReference,
          universalExportVoyageReference: vesselSchedule.universalExportVoyageReference,
          location: {
            UNLocationCode: portSchedule.location.UNLocationCode,
            locationName: portSchedule.location.locationName,
            facilitySMDGCode: portSchedule.location.facilitySMDGCode,
          },
          timestamps: vesselSchedule.timestamps,
          cutOffTimes: vesselSchedule.cutOffTimes,
        };

        if (vs.transportCalls) {
          vs.transportCalls.push(transportCall);
        }
      }
    }

    // Filter out services with no vessel schedules
    return Array.from(serviceMap.values()).filter(
      (schedule) => schedule.vesselSchedules.length > 0
    );
  }
}

