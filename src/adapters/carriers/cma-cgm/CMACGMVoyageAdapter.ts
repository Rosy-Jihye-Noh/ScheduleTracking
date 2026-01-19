/**
 * CMA CGM Voyage Adapter
 * Implements ScheduleAdapter for CMA CGM's Voyage API
 */

import { ScheduleAdapter } from '@adapters/carriers/base/ScheduleAdapter';
import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { Logger } from '@infrastructure/logger/Logger';

/**
 * CMA CGM Voyage API Response Types
 */
interface CMACGMCommercialVoyage {
  shippingCompany: string;
  code: string;
  previousVoyage?: string;
  nextVoyage?: string;
  alternateReference?: string;
  statusCode?: string;
  bound?: string;
  service: {
    code: string;
    name: string;
    externalCode?: string;
  };
  vessel: {
    code: string;
    name: string;
    imo?: string;
    smdgLinerCode?: string;
  };
  calls?: CMACGMCommercialCall[];
  startLocation?: {
    name: string;
    internalCode: string;
    timeZone?: string;
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
  startDate?: {
    local: string;
    utc: string;
  };
}

interface CMACGMCommercialCall {
  id: string;
  type: 'Call' | 'Omit' | 'Canal';
  activities?: Array<'Load' | 'Discharge'>;
  voyageCode: string;
  shippingCompany: string;
  location: {
    name: string;
    internalCode: string;
    timeZone?: string;
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
  vessel: {
    code: string;
    name: string;
    imo: string;
    smdgLinerCode?: string;
  };
  service: {
    code: string;
    name: string;
    externalCode?: string;
  };
  berthDate?: {
    local: string;
    utc: string;
  };
  unberthDate?: {
    local: string;
    utc: string;
  };
  eospDate?: {
    local: string;
    utc: string;
  };
  sospDate?: {
    local: string;
    utc: string;
  };
  portCutoff?: {
    local: string;
    utc: string;
  };
  vgmCutoff?: {
    local: string;
    utc: string;
  };
  standardBookingAcceptanceCutoff?: {
    local: string;
    utc: string;
  };
  specialBookingAcceptanceCutoff?: {
    local: string;
    utc: string;
  };
  shippingInstructionCutoff?: {
    local: string;
    utc: string;
  };
  shippingInstructionFilingCutoff?: {
    local: string;
    utc: string;
  };
  customsCutoff?: {
    local: string;
    utc: string;
  };
  advanceFilingCutoff?: {
    local: string;
    utc: string;
  };
  earliestReceivingDate?: {
    local: string;
    utc: string;
  };
}

/**
 * CMA CGM Voyage Adapter
 * Provides access to Voyage operational data
 */
export class CMACGMVoyageAdapter implements ScheduleAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'CMCG';

  constructor() {
    this.config = ConfigLoader.loadCarrierConfig(this.carrierCode);
    this.httpClient = new HttpClient(this.carrierCode, this.config);
  }

  /**
   * Get schedule data from Voyage API
   * Supports multiple endpoints based on query parameters:
   * - voyageCode: Get voyage by code
   * - vesselIMO: Get current schedule for vessel
   * - from/to dates: Search voyages
   * - portCode/countryCode: Search commercial calls
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
    const baseEndpoint = this.config.apis.voyage?.endpoint;
    if (!baseEndpoint) {
      throw new Error('Voyage API endpoint not configured for CMA CGM');
    }

    const voyageCode = (params as any).voyageCode || params.carrierVoyageNumber;
    const vesselIMO = (params as any).vesselIMO || params.vesselIMONumber;
    const from = (params as any).from || params.startDate;
    const to = (params as any).to || params.endDate;
    const portCode = (params as any).portCode;
    const countryCode = (params as any).countryCode;

    try {
      if (voyageCode) {
        // GET /commercialVoyages/{voyageCode}
        const endpoint = `${baseEndpoint}/commercialVoyages/${encodeURIComponent(voyageCode)}`;
        Logger.info(`CMA CGM Voyage: Getting voyage by code`, {
          carrier: this.carrierCode,
          voyageCode,
          endpoint,
        });
        const voyage = await this.httpClient.get<CMACGMCommercialVoyage>(endpoint);
        return this.mapVoyageToDCSA([voyage]);
      } else if (vesselIMO && !from && !to) {
        // GET /vessels/{vesselIMO}/schedule
        const endpoint = `${baseEndpoint}/vessels/${encodeURIComponent(vesselIMO)}/schedule`;
        Logger.info(`CMA CGM Voyage: Getting current schedule for vessel`, {
          carrier: this.carrierCode,
          vesselIMO,
          endpoint,
        });
        const calls = await this.httpClient.get<CMACGMCommercialCall[]>(endpoint, {
          params: (params as any).shipcomp ? { shipcomp: (params as any).shipcomp } : undefined,
        });
        return this.mapCallsToDCSA(calls);
      } else if (portCode || countryCode) {
        // GET /commercialCalls (search calls) - when portCode or countryCode is provided
        const queryParams: Record<string, string | string[]> = {};
        if (from) queryParams.from = from;
        if (to) queryParams.to = to;
        if (portCode) {
          queryParams.portCode = Array.isArray(portCode) ? portCode : [portCode];
        }
        if (countryCode) {
          queryParams.countryCode = Array.isArray(countryCode) ? countryCode : [countryCode];
        }
        if (vesselIMO) {
          queryParams.vesselIMO = Array.isArray(vesselIMO) ? [vesselIMO] : [vesselIMO];
        }
        if ((params as any).serviceCode) {
          queryParams.serviceCode = Array.isArray((params as any).serviceCode)
            ? (params as any).serviceCode
            : [(params as any).serviceCode];
        }
        if ((params as any).voyageCode) {
          queryParams.voyageCode = Array.isArray((params as any).voyageCode)
            ? (params as any).voyageCode
            : [(params as any).voyageCode];
        }

        const endpoint = `${baseEndpoint}/commercialCalls`;
        Logger.info(`CMA CGM Voyage: Searching commercial calls`, {
          carrier: this.carrierCode,
          queryParams,
          endpoint,
        });
        const calls = await this.httpClient.get<CMACGMCommercialCall[]>(endpoint, {
          params: queryParams,
          headers: { range: '0-49' },
        });
        return this.mapCallsToDCSA(calls);
      } else if (from && to) {
        // GET /commercialVoyages (search voyages) - when only from/to dates are provided
        const queryParams: Record<string, string | string[]> = {
          from,
          to,
        };
        if ((params as any).searchType) {
          queryParams.searchType = (params as any).searchType;
        }
        if ((params as any).serviceCode) {
          queryParams.serviceCode = Array.isArray((params as any).serviceCode)
            ? (params as any).serviceCode
            : [(params as any).serviceCode];
        }
        if ((params as any).lineCode) {
          queryParams.lineCode = (params as any).lineCode;
        }
        if ((params as any).shipcomp) {
          queryParams.shipcomp = Array.isArray((params as any).shipcomp)
            ? (params as any).shipcomp
            : [(params as any).shipcomp];
        }
        if ((params as any).sort) {
          queryParams.sort = (params as any).sort;
        }

        const endpoint = `${baseEndpoint}/commercialVoyages`;
        Logger.info(`CMA CGM Voyage: Searching voyages`, {
          carrier: this.carrierCode,
          queryParams,
          endpoint,
        });
        const voyages = await this.httpClient.get<CMACGMCommercialVoyage[]>(endpoint, {
          params: queryParams,
          headers: { range: '0-49' },
        });
        return this.mapVoyageToDCSA(voyages);
      } else {
        throw new Error(
          'CMA CGM Voyage API requires at least one of: voyageCode, vesselIMO, (from and to dates), or (portCode/countryCode)'
        );
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `CMA CGM Voyage API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }

  /**
   * Map CMA CGM Voyage response to DCSA ServiceSchedule format
   * Handles both full voyage details (with calls) and voyage summaries (with startLocation/startDate only)
   * Preserves additional Voyage API fields (previousVoyage, nextVoyage, alternateReference, bound, facility info)
   */
  private mapVoyageToDCSA(voyages: CMACGMCommercialVoyage[]): ServiceSchedule[] {
    const serviceMap = new Map<string, any>();

    for (const voyage of voyages) {
      const serviceCode = voyage.service.code;
      if (!serviceMap.has(serviceCode)) {
        // Create ServiceSchedule with additional fields preserved
        serviceMap.set(serviceCode, {
          carrierServiceCode: serviceCode,
          carrierServiceName: voyage.service.name,
          vesselSchedules: [],
        });
      }

      const schedule = serviceMap.get(serviceCode)!;
      
      // Check if voyage has calls array (full voyage details)
      if (voyage.calls && voyage.calls.length > 0) {
        const vesselSchedule = {
          isDummyVessel: false,
          vessel: {
            vesselIMONumber: voyage.vessel.imo || '0000000',
            name: voyage.vessel.name,
            vesselCode: voyage.vessel.code,
            smdgLinerCode: voyage.vessel.smdgLinerCode,
          },
          transportCalls: voyage.calls.map((call) => ({
            transportCallReference: call.id,
            carrierImportVoyageNumber: voyage.code,
            carrierExportVoyageNumber: voyage.code,
            location: {
              UNLocationCode: call.location.locationCodifications?.find(
                (loc) => loc.codificationType === 'UN/Locode'
              )?.codification || call.location.internalCode,
              locationName: call.location.name,
              facilitySMDGCode: call.location.facility?.facilityCodifications?.find(
                (fac) => fac.codificationType === 'SMDG'
              )?.codification,
            },
            timestamps: [
              ...(call.berthDate
                ? [
                    {
                      eventTypeCode: 'ARRI' as const,
                      eventClassifierCode: 'EST' as const,
                      eventDateTime: call.berthDate.utc,
                    },
                  ]
                : []),
              ...(call.unberthDate
                ? [
                    {
                      eventTypeCode: 'DEPA' as const,
                      eventClassifierCode: 'EST' as const,
                      eventDateTime: call.unberthDate.utc,
                    },
                  ]
                : []),
            ],
            // Preserve voyage metadata
            voyageMetadata: {
              shippingCompany: voyage.shippingCompany,
              previousVoyage: voyage.previousVoyage,
              nextVoyage: voyage.nextVoyage,
              alternateReference: voyage.alternateReference,
              bound: voyage.bound,
            },
          })),
        };
        schedule.vesselSchedules.push(vesselSchedule);
      } else if (voyage.startLocation && voyage.startDate) {
        // Voyage summary (from /commercialVoyages endpoint) - use startLocation and startDate
        const vesselIMO = voyage.vessel.imo || '0000000';
        const vesselName = voyage.vessel.name || 'UNKNOWN';
        
        // Find or create vessel schedule for this vessel
        let vesselSchedule = schedule.vesselSchedules.find(
          (vs: any) => vs.vessel?.vesselIMONumber === vesselIMO
        );
        
        if (!vesselSchedule) {
          vesselSchedule = {
            isDummyVessel: vesselIMO === '0000000',
            vessel: {
              vesselIMONumber: vesselIMO,
              name: vesselName,
              vesselCode: voyage.vessel.code,
              smdgLinerCode: voyage.vessel.smdgLinerCode,
            },
            transportCalls: [],
          };
          schedule.vesselSchedules.push(vesselSchedule);
        }

        // Add transport call from startLocation with facility info
        const transportCall: any = {
          transportCallReference: `voyage-${voyage.code}-${voyage.startLocation.internalCode}`,
          carrierImportVoyageNumber: voyage.code,
          carrierExportVoyageNumber: voyage.code,
          location: {
            UNLocationCode: voyage.startLocation.locationCodifications?.find(
              (loc) => loc.codificationType === 'UN/Locode'
            )?.codification || voyage.startLocation.internalCode,
            locationName: voyage.startLocation.name,
            facilitySMDGCode: voyage.startLocation.facility?.facilityCodifications?.find(
              (fac) => fac.codificationType === 'SMDG'
            )?.codification,
          },
          timestamps: [
            {
              eventTypeCode: 'DEPA' as const,
              eventClassifierCode: 'EST' as const,
              eventDateTime: voyage.startDate.utc,
            },
          ],
          // Preserve voyage metadata and facility details
          voyageMetadata: {
            shippingCompany: voyage.shippingCompany,
            previousVoyage: voyage.previousVoyage,
            nextVoyage: voyage.nextVoyage,
            alternateReference: voyage.alternateReference,
            bound: voyage.bound,
          },
          facility: voyage.startLocation.facility ? {
            name: voyage.startLocation.facility.name,
            facilityType: voyage.startLocation.facility.facilityType,
            internalCode: voyage.startLocation.facility.internalCode,
            facilityCodifications: voyage.startLocation.facility.facilityCodifications,
          } : undefined,
        };
        
        if (vesselSchedule.transportCalls) {
          vesselSchedule.transportCalls.push(transportCall);
        }
      }
    }

    // Filter out services with no vessel schedules
    return Array.from(serviceMap.values()).filter(
      (schedule) => schedule.vesselSchedules.length > 0
    ) as ServiceSchedule[];
  }

  /**
   * Map CMA CGM Commercial Calls to DCSA ServiceSchedule format
   */
  private mapCallsToDCSA(calls: CMACGMCommercialCall[]): ServiceSchedule[] {
    const serviceMap = new Map<string, ServiceSchedule>();
    const vesselMap = new Map<string, any>();

    for (const call of calls) {
      const serviceCode = call.service.code;
      const vesselKey = `${call.vessel.imo}-${call.voyageCode}`;

      if (!serviceMap.has(serviceCode)) {
        serviceMap.set(serviceCode, {
          carrierServiceCode: serviceCode,
          carrierServiceName: call.service.name,
          vesselSchedules: [],
        });
      }

      if (!vesselMap.has(vesselKey)) {
        vesselMap.set(vesselKey, {
          isDummyVessel: false,
          vessel: {
            vesselIMONumber: call.vessel.imo,
            name: call.vessel.name,
          },
          transportCalls: [],
        });
        serviceMap.get(serviceCode)!.vesselSchedules.push(vesselMap.get(vesselKey)!);
      }

      const transportCall = {
        transportCallReference: call.id,
        carrierImportVoyageNumber: call.voyageCode,
        carrierExportVoyageNumber: call.voyageCode,
        location: {
          UNLocationCode:
            call.location.locationCodifications?.find((loc) => loc.codificationType === 'UN/Locode')
              ?.codification || call.location.internalCode,
          locationName: call.location.name,
        },
        timestamps: [
          ...(call.berthDate
            ? [
                {
                  eventTypeCode: 'ARRI' as const,
                  eventClassifierCode: 'EST' as const,
                  eventDateTime: call.berthDate.utc,
                },
              ]
            : []),
          ...(call.unberthDate
            ? [
                {
                  eventTypeCode: 'DEPA' as const,
                  eventClassifierCode: 'EST' as const,
                  eventDateTime: call.unberthDate.utc,
                },
              ]
            : []),
        ],
      };

      vesselMap.get(vesselKey)!.transportCalls.push(transportCall);
    }

    return Array.from(serviceMap.values());
  }
}

