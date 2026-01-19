/**
 * CMA CGM Proforma Adapter
 * Implements ScheduleAdapter for CMA CGM's Proforma API (Lines & Services)
 */

import { ScheduleAdapter } from '@adapters/carriers/base/ScheduleAdapter';
import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { Logger } from '@infrastructure/logger/Logger';

/**
 * CMA CGM Proforma API Response Types
 */
interface CMACGMService {
  code: string;
  name: string;
  universalServiceReferences?: string[];
  line?: {
    code: string;
    name: string;
  };
  carriers?: Array<{
    shipcomp: string;
    code: string;
  }>;
  serviceType?: string;
  active?: boolean;
  frequency?: number;
  departureDay?: string;
  rotationDuration?: number;
  rotationType?: {
    type: string;
    bound: Array<{
      universalServiceReference?: string;
      for: string;
      startLocation: {
        name: string;
        internalCode: string;
        locationCodifications?: Array<{
          codificationType: string;
          codification: string;
        }>;
      };
    }>;
  };
  applicabilityPeriod?: {
    periodStart: string;
    periodEnd: string;
  };
}

interface CMACGMProformaCall {
  port: {
    code: string;
    name: string;
    unLocode?: string;
  };
  terminal?: {
    code: string;
    name: string;
    smdgTerminalCode?: string;
  };
  bound: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'ROUND';
  transitTime?: number;
}

interface CMACGMVessel {
  code: string;
  name: string;
  imo: string;
  smdgLinerCode?: string;
}

/**
 * CMA CGM Proforma Adapter
 * Provides access to Lines & Services data
 */
export class CMACGMProformaAdapter implements ScheduleAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'CMCG';

  constructor() {
    this.config = ConfigLoader.loadCarrierConfig(this.carrierCode);
    this.httpClient = new HttpClient(this.carrierCode, this.config);
  }

  /**
   * Get schedule data from Proforma API
   * Supports multiple endpoints based on query parameters:
   * - serviceCode: Get service by code
   * - lineCode: Get line by code
   * - zoneFromCode + zoneToCode: Search services by zones
   * - port/terminal/vesselIMO: Search services
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
    const baseEndpoint = this.config.apis.proforma?.endpoint;
    if (!baseEndpoint) {
      throw new Error('Proforma API endpoint not configured for CMA CGM');
    }

    // Determine which endpoint to use based on parameters
    const serviceCode = (params as any).serviceCode || params.carrierServiceCode;
    const lineCode = (params as any).lineCode;
    const zoneFromCode = (params as any).zoneFromCode;
    const zoneToCode = (params as any).zoneToCode;

    try {
      let services: CMACGMService[] = [];

      if (serviceCode) {
        // GET /services/{serviceCode}
        const endpoint = `${baseEndpoint}/services/${encodeURIComponent(serviceCode)}`;
        Logger.info(`CMA CGM Proforma: Getting service by code`, {
          carrier: this.carrierCode,
          serviceCode,
          endpoint,
        });
        const service = await this.httpClient.get<CMACGMService>(endpoint);
        services = [service];
      } else if (lineCode) {
        // GET /lines/{lineCode}
        const endpoint = `${baseEndpoint}/lines/${encodeURIComponent(lineCode)}`;
        Logger.info(`CMA CGM Proforma: Getting line by code`, {
          carrier: this.carrierCode,
          lineCode,
          endpoint,
        });
        await this.httpClient.get<{ code: string; name: string }>(endpoint);
        // Note: Line doesn't directly return services, need to search services by line
        const searchEndpoint = `${baseEndpoint}/services?lineCode=${encodeURIComponent(lineCode)}`;
        services = await this.httpClient.get<CMACGMService[]>(searchEndpoint, {
          headers: { range: '0-49' },
        });
      } else if (zoneFromCode && zoneToCode) {
        // GET /zones/{zoneFromCode}/zones/{zoneToCode}/services
        const endpoint = `${baseEndpoint}/zones/${encodeURIComponent(zoneFromCode)}/zones/${encodeURIComponent(zoneToCode)}/services`;
        Logger.info(`CMA CGM Proforma: Searching services by zones`, {
          carrier: this.carrierCode,
          zoneFromCode,
          zoneToCode,
          endpoint,
        });
        services = await this.httpClient.get<CMACGMService[]>(endpoint, {
          headers: { range: '0-49' },
        });
      } else {
        // GET /services (search services)
        const queryParams: Record<string, string> = {};
        if (params.carrierServiceCode) {
          queryParams.serviceCode = params.carrierServiceCode;
        }
        if ((params as any).port) {
          queryParams.port = (params as any).port;
        }
        if ((params as any).terminal) {
          queryParams.terminal = (params as any).terminal;
        }
        if ((params as any).vesselIMO) {
          queryParams.vesselIMO = (params as any).vesselIMO;
        }
        if ((params as any).lineCode) {
          queryParams.lineCode = (params as any).lineCode;
        }

        const endpoint = `${baseEndpoint}/services`;
        Logger.info(`CMA CGM Proforma: Searching services`, {
          carrier: this.carrierCode,
          queryParams,
          endpoint,
        });
        services = await this.httpClient.get<CMACGMService[]>(endpoint, {
          params: queryParams,
          headers: { range: '0-49' },
        });
      }

      // Convert to DCSA ServiceSchedule format
      const mapped = this.mapProformaToDCSA(services);
      Logger.debug(`CMA CGM Proforma: Mapped services`, {
        carrier: this.carrierCode,
        count: mapped.length,
        firstService: mapped[0] ? Object.keys(mapped[0]) : [],
      });
      return mapped;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `CMA CGM Proforma API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }

  /**
   * Map CMA CGM Proforma response to DCSA ServiceSchedule format
   * Note: Proforma API provides service metadata, not actual vessel schedules
   * Returns ServiceSchedule with additional Proforma-specific fields
   */
  private mapProformaToDCSA(services: CMACGMService[]): ServiceSchedule[] {
    return services.map((service) => {
      // Create object with all fields from Proforma API response
      // Use 'any' to bypass TypeScript type checking and preserve all fields
      const result: any = {
        carrierServiceCode: service.code,
        carrierServiceName: service.name,
        vesselSchedules: [], // Proforma API doesn't provide vessel schedules directly
        // Include all additional Proforma API fields
        universalServiceReferences: service.universalServiceReferences,
        line: service.line,
        carriers: service.carriers,
        serviceType: service.serviceType,
        active: service.active,
        frequency: service.frequency,
        departureDay: service.departureDay,
        rotationDuration: service.rotationDuration,
        rotationType: service.rotationType,
        applicabilityPeriod: service.applicabilityPeriod,
      };
      return result as ServiceSchedule;
    });
  }

  /**
   * Get service fleet
   * @param serviceCode Service code
   * @returns Array of vessels
   */
  async getServiceFleet(serviceCode: string): Promise<CMACGMVessel[]> {
    const baseEndpoint = this.config.apis.proforma?.endpoint;
    if (!baseEndpoint) {
      throw new Error('Proforma API endpoint not configured for CMA CGM');
    }

    const endpoint = `${baseEndpoint}/services/${encodeURIComponent(serviceCode)}/fleet`;
    return this.httpClient.get<CMACGMVessel[]>(endpoint, {
      headers: { range: '0-49' },
    });
  }

  /**
   * Get service proforma calls
   * @param serviceCode Service code
   * @returns Array of proforma calls
   */
  async getServiceProformaCalls(serviceCode: string): Promise<CMACGMProformaCall[]> {
    const baseEndpoint = this.config.apis.proforma?.endpoint;
    if (!baseEndpoint) {
      throw new Error('Proforma API endpoint not configured for CMA CGM');
    }

    const endpoint = `${baseEndpoint}/services/${encodeURIComponent(serviceCode)}/proformacalls`;
    return this.httpClient.get<CMACGMProformaCall[]>(endpoint, {
      headers: { range: '0-49' },
    });
  }
}

