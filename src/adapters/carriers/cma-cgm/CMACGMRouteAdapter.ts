/**
 * CMA CGM Route Adapter
 * Implements ScheduleAdapter for CMA CGM's Routing Finder API
 */

import { ScheduleAdapter } from '@adapters/carriers/base/ScheduleAdapter';
import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { Logger } from '@infrastructure/logger/Logger';

/**
 * CMA CGM Route API Response Types
 */
interface CMACGMRouting {
  shippingCompany: string;
  solutionNo: number;
  transitTime: number;
  solutionFootprint?: {
    carbonDioxide?: number;
    sulphurOxide?: number;
    nitrogeneOxide?: number;
    smallParticle?: number;
  };
  specificRoutings?: string[];
  routingDetails: CMACGMRoutingDetail[];
}

interface CMACGMRoutingDetail {
  pointFrom: {
    location: {
      name: string;
      internalCode: string;
      locationCodifications?: Array<{
        codificationType: string;
        codification: string;
      }>;
      facility?: {
        name: string;
        facilityType?: string;
        internalCode: string;
        facilityCodifications?: Array<{
          codificationType: string;
          codification: string;
        }>;
      };
    };
    callId?: string;
    departureDateLocal?: string;
    departureDateGmt?: string;
    cutOff?: {
      portCutoff?: { local: string; utc: string };
      vgm?: { local: string; utc: string };
      standardBookingAcceptance?: { local: string; utc: string };
      specialBookingAcceptance?: { local: string; utc: string };
      shippingInstructionAcceptance?: { local: string; utc: string };
      shippingInstructionFilingAcceptance?: { local: string; utc: string };
      customsAcceptance?: { local: string; utc: string };
      advanceFilingCutoff?: { local: string; utc: string };
      earliestReceivingDate?: { local: string; utc: string };
    };
  };
  pointTo: {
    location: {
      name: string;
      internalCode: string;
      locationCodifications?: Array<{
        codificationType: string;
        codification: string;
      }>;
      facility?: {
        name: string;
        facilityType?: string;
        internalCode: string;
        facilityCodifications?: Array<{
          codificationType: string;
          codification: string;
        }>;
      };
    };
    callId?: string;
    arrivalDateLocal?: string;
    arrivalDateGmt?: string;
  };
  transportation: {
    transportationPhase?: 'Import' | 'Export' | 'Transshipment';
    meanOfTransport?: string;
    vehicule?: {
      vehiculeType?: string;
      vehiculeName?: string;
      reference?: string;
      referenceType?: string;
      internalReference?: string;
      smdgLinerCode?: string;
    };
    voyage?: {
      voyageReference?: string;
      service?: {
        code?: string;
        internalCode?: string;
      };
    };
  };
  legTransitTime?: number;
  legFootprint?: {
    carbonDioxide?: number;
    sulphurOxide?: number;
    nitrogeneOxide?: number;
    smallParticle?: number;
  };
}

/**
 * CMA CGM Route Adapter
 * Provides access to Routing Finder (Port-to-Port Schedule)
 */
export class CMACGMRouteAdapter implements ScheduleAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'CMCG';

  constructor() {
    this.config = ConfigLoader.loadCarrierConfig(this.carrierCode);
    this.httpClient = new HttpClient(this.carrierCode, this.config);
  }

  /**
   * Get schedule data from Route API
   * GET /routings - List schedule(s) between two ports
   * 
   * Required parameters:
   * - placeOfLoading OR unLocodePlaceOfLoading
   * - placeOfDischarge OR unLocodePlaceOfDischarge
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
    const baseEndpoint = this.config.apis.route?.endpoint;
    if (!baseEndpoint) {
      throw new Error('Route API endpoint not configured for CMA CGM');
    }

    const placeOfLoading = (params as any).placeOfLoading;
    const placeOfDischarge = (params as any).placeOfDischarge;
    const unLocodePlaceOfLoading = (params as any).unLocodePlaceOfLoading;
    const unLocodePlaceOfDischarge = (params as any).unLocodePlaceOfDischarge;

    // At least one loading and one discharge location must be provided
    if (!placeOfLoading && !unLocodePlaceOfLoading) {
      throw new Error('CMA CGM Route API requires placeOfLoading or unLocodePlaceOfLoading parameter');
    }
    if (!placeOfDischarge && !unLocodePlaceOfDischarge) {
      throw new Error('CMA CGM Route API requires placeOfDischarge or unLocodePlaceOfDischarge parameter');
    }

    const queryParams: Record<string, string | number | boolean | string[]> = {};
    if (placeOfLoading) queryParams.placeOfLoading = placeOfLoading;
    if (unLocodePlaceOfLoading) queryParams.unLocodePlaceOfLoading = unLocodePlaceOfLoading;
    if (placeOfDischarge) queryParams.placeOfDischarge = placeOfDischarge;
    if (unLocodePlaceOfDischarge) queryParams.unLocodePlaceOfDischarge = unLocodePlaceOfDischarge;
    if ((params as any).shippingCompany) queryParams.shippingCompany = (params as any).shippingCompany;
    if ((params as any).departureDate) queryParams.departureDate = (params as any).departureDate;
    if ((params as any).arrivalDate) queryParams.arrivalDate = (params as any).arrivalDate;
    if ((params as any).searchRange) queryParams.searchRange = parseInt((params as any).searchRange, 10);
    if ((params as any).polVesselIMO) queryParams.polVesselIMO = (params as any).polVesselIMO;
    if ((params as any).polServiceCode) queryParams.polServiceCode = (params as any).polServiceCode;
    if ((params as any).maxTs) queryParams.maxTs = parseInt((params as any).maxTs, 10);
    if ((params as any).numberOfTEU) queryParams.numberOfTEU = parseInt((params as any).numberOfTEU, 10);
    if ((params as any).specificRoutings) {
      queryParams.specificRoutings = Array.isArray((params as any).specificRoutings)
        ? (params as any).specificRoutings
        : [(params as any).specificRoutings];
    }
    if ((params as any).useRoutingStatistics !== undefined) {
      queryParams.useRoutingStatistics = (params as any).useRoutingStatistics === 'true' || (params as any).useRoutingStatistics === true;
    }

    try {
      const endpoint = `${baseEndpoint}/routings`;
      Logger.info(`CMA CGM Route: Getting routings between ports`, {
        carrier: this.carrierCode,
        queryParams,
        endpoint,
      });

      const routings = await this.httpClient.get<CMACGMRouting[]>(endpoint, {
        params: queryParams,
        headers: { range: '0-49' },
      });

      return this.mapRouteToDCSA(routings);
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `CMA CGM Route API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }

  /**
   * Map CMA CGM Route response to DCSA ServiceSchedule format
   */
  private mapRouteToDCSA(routings: CMACGMRouting[]): ServiceSchedule[] {
    const serviceMap = new Map<string, ServiceSchedule>();

    for (const routing of routings) {
      // Group by service code from routing details
      for (const detail of routing.routingDetails) {
        // Skip if no service code or no transportation info
        const serviceCode = detail.transportation.voyage?.service?.code;
        if (!serviceCode) {
          Logger.debug(`CMA CGM Route: Skipping routing detail without service code`, {
            carrier: this.carrierCode,
            solutionNo: routing.solutionNo,
            pointFrom: detail.pointFrom.location.internalCode,
            pointTo: detail.pointTo.location.internalCode,
          });
          continue;
        }

        const vesselIMO = detail.transportation.vehicule?.reference || '0000000';
        const vesselName = detail.transportation.vehicule?.vehiculeName;

        // Skip if no vessel info and no dates (incomplete data)
        if (!vesselName && !detail.pointFrom.departureDateGmt && !detail.pointTo.arrivalDateGmt) {
          Logger.debug(`CMA CGM Route: Skipping routing detail with incomplete data`, {
            carrier: this.carrierCode,
            solutionNo: routing.solutionNo,
            serviceCode,
          });
          continue;
        }

        if (!serviceMap.has(serviceCode)) {
          serviceMap.set(serviceCode, {
            carrierServiceCode: serviceCode,
            carrierServiceName: serviceCode,
            vesselSchedules: [],
          });
        }

        const schedule = serviceMap.get(serviceCode)!;
        let vesselSchedule = schedule.vesselSchedules.find(
          (vs) => vs.vessel?.vesselIMONumber === vesselIMO
        );

        if (!vesselSchedule) {
          vesselSchedule = {
            isDummyVessel: vesselIMO === '0000000' || !vesselName,
            vessel: {
              vesselIMONumber: vesselIMO,
              name: vesselName || 'UNKNOWN',
            },
            transportCalls: [],
          };
          schedule.vesselSchedules.push(vesselSchedule);
        }

        // Build timestamps array
        const timestamps = [];
        if (detail.pointFrom.departureDateGmt) {
          timestamps.push({
            eventTypeCode: 'DEPA' as const,
            eventClassifierCode: 'EST' as const,
            eventDateTime: detail.pointFrom.departureDateGmt,
          });
        }
        if (detail.pointTo.arrivalDateGmt) {
          timestamps.push({
            eventTypeCode: 'ARRI' as const,
            eventClassifierCode: 'EST' as const,
            eventDateTime: detail.pointTo.arrivalDateGmt,
          });
        }

        // Only add transport call if we have at least one timestamp or valid location
        if (timestamps.length > 0 || detail.pointFrom.location.internalCode) {
          const transportCall = {
            transportCallReference: detail.pointFrom.callId || `route-${routing.solutionNo}-${detail.pointFrom.location.internalCode}-${detail.pointTo.location.internalCode}`,
            carrierImportVoyageNumber: detail.transportation.voyage?.voyageReference || 'UNKNOWN',
            carrierExportVoyageNumber: detail.transportation.voyage?.voyageReference || 'UNKNOWN',
            location: {
              UNLocationCode:
                detail.pointFrom.location.locationCodifications?.find(
                  (loc) => loc.codificationType === 'UN/Locode'
                )?.codification || detail.pointFrom.location.internalCode,
              locationName: detail.pointFrom.location.name,
            },
            timestamps,
          };

          if (vesselSchedule.transportCalls) {
            vesselSchedule.transportCalls.push(transportCall);
          }
        }
      }
    }

    // Filter out services with no valid vessel schedules
    const validSchedules = Array.from(serviceMap.values()).filter(
      (schedule) => schedule.vesselSchedules.length > 0 && 
                   schedule.vesselSchedules.some(
                     (vs) => vs.transportCalls && vs.transportCalls.length > 0
                   )
    );

    return validSchedules;
  }
}

