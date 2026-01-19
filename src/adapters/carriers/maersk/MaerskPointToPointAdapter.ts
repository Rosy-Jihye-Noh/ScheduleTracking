/**
 * Maersk Point-to-Point Adapter
 * Implements ScheduleAdapter for Maersk's DCSA Point-to-Point Routes API
 */

import { ScheduleAdapter } from '@adapters/carriers/base/ScheduleAdapter';
import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { Logger } from '@infrastructure/logger/Logger';

/**
 * Maersk Point-to-Point API Response Types (DCSA Standard)
 */
interface MaerskPointToPoint {
  placeOfReceipt: {
    facilityTypeCode: string;
    location: {
      locationName?: string;
      UNLocationCode?: string;
      address?: {
        street: string;
        streetNumber?: string;
        floor?: string;
        postCode?: string;
        city: string;
        stateRegion?: string;
        countryCode: string;
      };
      facility?: {
        facilityCode: string;
        facilityCodeListProvider: 'SMDG' | 'BIC';
      };
    };
    dateTime: string;
  };
  placeOfDelivery: {
    facilityTypeCode: string;
    location: {
      locationName?: string;
      UNLocationCode?: string;
      address?: {
        street: string;
        streetNumber?: string;
        floor?: string;
        postCode?: string;
        city: string;
        stateRegion?: string;
        countryCode: string;
      };
      facility?: {
        facilityCode: string;
        facilityCodeListProvider: 'SMDG' | 'BIC';
      };
    };
    dateTime: string;
  };
  receiptTypeAtOrigin?: 'CY' | 'SD' | 'CFS';
  deliveryTypeAtDestination?: 'CY' | 'SD' | 'CFS';
  cutOffTimes?: Array<{
    cutOffDateTimeCode: string;
    cutOffDateTime: string;
  }>;
  solutionNumber?: number;
  routingReference?: string;
  transitTime?: number;
  legs: Array<{
    sequenceNumber: number;
    transport: {
      modeOfTransport: 'VESSEL' | 'BARGE' | 'RAIL' | 'TRUCK' | 'RAIL_TRUCK' | 'BARGE_TRUCK' | 'BARGE_RAIL' | 'MULTIMODAL';
      portVisitReference?: string;
      transportCallReference?: string;
      servicePartners?: Array<{
        carrierCode: string;
        carrierCodeListProvider?: 'SMDG' | 'NMFTA';
        carrierServiceName?: string;
        carrierServiceCode?: string;
        carrierImportVoyageNumber?: string;
        carrierExportVoyageNumber?: string;
      }>;
      universalServiceReference?: string;
      universalExportVoyageReference?: string;
      universalImportVoyageReference?: string;
      vessel?: {
        vesselIMONumber: string;
        MMSINumber?: string;
        name: string;
        flag?: string;
        callSign?: string;
        operatorCarrierCode?: string;
        operatorCarrierCodeListProvider?: 'SMDG' | 'NMFTA';
      };
      barge?: {
        vesselIMONumber: string;
        MMSINumber?: string;
        name: string;
        flag?: string;
        callSign?: string;
        operatorCarrierCode?: string;
        operatorCarrierCodeListProvider?: 'SMDG' | 'NMFTA';
      };
    };
    departure: {
      facilityTypeCode: string;
      location: {
        locationName?: string;
        UNLocationCode?: string;
        address?: {
          street: string;
          streetNumber?: string;
          floor?: string;
          postCode?: string;
          city: string;
          stateRegion?: string;
          countryCode: string;
        };
        facility?: {
          facilityCode: string;
          facilityCodeListProvider: 'SMDG' | 'BIC';
        };
      };
      dateTime: string;
    };
    arrival: {
      facilityTypeCode: string;
      location: {
        locationName?: string;
        UNLocationCode?: string;
        address?: {
          street: string;
          streetNumber?: string;
          floor?: string;
          postCode?: string;
          city: string;
          stateRegion?: string;
          countryCode: string;
        };
        facility?: {
          facilityCode: string;
          facilityCodeListProvider: 'SMDG' | 'BIC';
        };
      };
      dateTime: string;
    };
  }>;
}

/**
 * Maersk Point-to-Point Adapter
 * DCSA standard API - maps PointToPoint[] to ServiceSchedule[]
 */
export class MaerskPointToPointAdapter implements ScheduleAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'MAERSK';

  constructor() {
    this.config = ConfigLoader.loadCarrierConfig(this.carrierCode);
    this.httpClient = new HttpClient(this.carrierCode, this.config);
  }

  /**
   * Get point-to-point routes
   * @param params Query parameters
   * @returns Array of service schedules
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
    const endpoint = this.config.apis.pointToPoint?.endpoint;
    if (!endpoint) {
      throw new Error('Point-to-Point API endpoint not configured for Maersk');
    }

    // Extract Point-to-Point specific parameters
    const placeOfReceipt = (params as any).placeOfReceipt;
    const placeOfDelivery = (params as any).placeOfDelivery;
    const departureStartDate = (params as any).departureStartDate || params.startDate;
    const departureEndDate = (params as any).departureEndDate;
    const arrivalStartDate = (params as any).arrivalStartDate;
    const arrivalEndDate = (params as any).arrivalEndDate;
    const maxTranshipment = (params as any).maxTranshipment;
    const receiptTypeAtOrigin = (params as any).receiptTypeAtOrigin || 'CY';
    const deliveryTypeAtDestination = (params as any).deliveryTypeAtDestination || 'CY';
    const cargoType = (params as any).cargoType;
    const ISOEquipmentCode = (params as any).ISOEquipmentCode;
    const stuffingWeight = (params as any).stuffingWeight;
    const stuffingVolume = (params as any).stuffingVolume;

    // Required parameters
    if (!placeOfReceipt) {
      throw new Error('Maersk Point-to-Point API requires placeOfReceipt (UNLocationCode) parameter');
    }
    if (!placeOfDelivery) {
      throw new Error('Maersk Point-to-Point API requires placeOfDelivery (UNLocationCode) parameter');
    }

    // Build query parameters
    const queryParams: Record<string, string> = {
      placeOfReceipt: placeOfReceipt,
      placeOfDelivery: placeOfDelivery,
    };

    if (departureStartDate) {
      queryParams.departureStartDate = departureStartDate;
    }
    if (departureEndDate) {
      queryParams.departureEndDate = departureEndDate;
    }
    if (arrivalStartDate) {
      queryParams.arrivalStartDate = arrivalStartDate;
    }
    if (arrivalEndDate) {
      queryParams.arrivalEndDate = arrivalEndDate;
    }
    if (maxTranshipment !== undefined) {
      queryParams.maxTranshipment = maxTranshipment.toString();
    }
    if (receiptTypeAtOrigin) {
      queryParams.receiptTypeAtOrigin = receiptTypeAtOrigin;
    }
    if (deliveryTypeAtDestination) {
      queryParams.deliveryTypeAtDestination = deliveryTypeAtDestination;
    }
    if (cargoType) {
      queryParams.cargoType = cargoType;
    }
    if (ISOEquipmentCode) {
      queryParams.ISOEquipmentCode = ISOEquipmentCode;
    }
    if (stuffingWeight) {
      queryParams.stuffingWeight = stuffingWeight.toString();
    }
    if (stuffingVolume) {
      queryParams.stuffingVolume = stuffingVolume.toString();
    }

    // Add API-Version header if needed
    const headers: Record<string, string> = {};
    if (this.config.apis.pointToPoint?.version) {
      const majorVersion = this.config.apis.pointToPoint.version.split('.')[0];
      headers['API-Version'] = majorVersion;
    }
    if (cargoType || ISOEquipmentCode || stuffingWeight || stuffingVolume) {
      headers['Carrier-Extensions-Version'] = '1';
    }

    try {
      Logger.info(`Maersk Point-to-Point: Getting routes`, {
        carrier: this.carrierCode,
        placeOfReceipt,
        placeOfDelivery,
        endpoint,
        queryParams: queryParams,
        headers: headers,
      });

      // DCSA standard API - response is PointToPoint[]
      const response = await this.httpClient.get<MaerskPointToPoint[]>(endpoint, {
        params: queryParams,
        headers: headers,
      });

      // Log actual API response for debugging
      Logger.info(`Maersk Point-to-Point: Raw API response`, {
        carrier: this.carrierCode,
        responseLength: Array.isArray(response) ? response.length : 'not an array',
        responseType: typeof response,
        isEmpty: Array.isArray(response) ? response.length === 0 : true,
        responsePreview: Array.isArray(response) && response.length > 0 
          ? JSON.stringify(response[0]).substring(0, 1000)
          : Array.isArray(response) 
            ? 'Empty array []'
            : JSON.stringify(response).substring(0, 500),
      });

      // Map PointToPoint[] to ServiceSchedule[]
      const mapped = this.mapPointToPointToDCSA(response);
      
      Logger.info(`Maersk Point-to-Point: Mapped result`, {
        carrier: this.carrierCode,
        routesCount: Array.isArray(response) ? response.length : 0,
        mappedSchedulesCount: mapped.length,
        hasVesselSchedules: mapped.some(s => s.vesselSchedules && s.vesselSchedules.length > 0),
      });

      return mapped;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Maersk Point-to-Point API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }

  /**
   * Map Maersk Point-to-Point response to DCSA ServiceSchedule format
   * Groups routes by service and creates ServiceSchedule entries
   * Preserves original Point-to-Point fields (placeOfReceipt, placeOfDelivery, solutionNumber, etc.)
   */
  private mapPointToPointToDCSA(routes: MaerskPointToPoint[]): ServiceSchedule[] {
    if (!Array.isArray(routes) || routes.length === 0) {
      Logger.debug(`Maersk Point-to-Point: Empty or invalid routes array`, {
        carrier: this.carrierCode,
        routesType: typeof routes,
        routesLength: Array.isArray(routes) ? routes.length : 'not an array',
      });
      return [];
    }

    Logger.debug(`Maersk Point-to-Point: Mapping ${routes.length} routes`, {
      carrier: this.carrierCode,
    });

    // Map to store service schedules with route information
    const serviceMap = new Map<string, ServiceSchedule & {
      pointToPointRoutes?: Array<{
        placeOfReceipt: MaerskPointToPoint['placeOfReceipt'];
        placeOfDelivery: MaerskPointToPoint['placeOfDelivery'];
        receiptTypeAtOrigin?: MaerskPointToPoint['receiptTypeAtOrigin'];
        deliveryTypeAtDestination?: MaerskPointToPoint['deliveryTypeAtDestination'];
        cutOffTimes?: MaerskPointToPoint['cutOffTimes'];
        solutionNumber?: MaerskPointToPoint['solutionNumber'];
        routingReference?: MaerskPointToPoint['routingReference'];
        transitTime?: MaerskPointToPoint['transitTime'];
      }>;
    }>();

    for (const route of routes) {
      if (!route.legs || !Array.isArray(route.legs) || route.legs.length === 0) {
        Logger.debug(`Maersk Point-to-Point: Route has no legs`, {
          carrier: this.carrierCode,
          routeSolutionNumber: route.solutionNumber,
        });
        continue;
      }

      // Extract service code from the first VESSEL/BARGE leg for route-level metadata
      let routeServiceCode: string | undefined;
      for (const leg of route.legs) {
        const transport = leg.transport;
        if ((transport.modeOfTransport === 'VESSEL' || transport.modeOfTransport === 'BARGE') && 
            transport.servicePartners?.[0]?.carrierServiceCode) {
          routeServiceCode = transport.servicePartners[0].carrierServiceCode;
          break;
        }
      }
      if (!routeServiceCode) {
        routeServiceCode = 'UNKNOWN_SERVICE';
      }

      // Process each leg to extract service and vessel information
      for (const leg of route.legs) {
        const transport = leg.transport;
        
        // Only process VESSEL and BARGE transports (skip RAIL, TRUCK, etc.)
        if (transport.modeOfTransport !== 'VESSEL' && transport.modeOfTransport !== 'BARGE') {
          Logger.debug(`Maersk Point-to-Point: Skipping non-vessel transport`, {
            carrier: this.carrierCode,
            modeOfTransport: transport.modeOfTransport,
            legSequence: leg.sequenceNumber,
          });
          continue;
        }

        const vessel = transport.vessel || transport.barge;
        if (!vessel) {
          Logger.debug(`Maersk Point-to-Point: Leg has no vessel/barge`, {
            carrier: this.carrierCode,
            legSequence: leg.sequenceNumber,
            modeOfTransport: transport.modeOfTransport,
          });
          continue;
        }

        // Get service code from servicePartners or use a default
        const servicePartner = transport.servicePartners?.[0];
        const serviceCode = servicePartner?.carrierServiceCode || 'UNKNOWN_SERVICE';
        const serviceName = servicePartner?.carrierServiceName || 'Unknown Service';

        if (!serviceMap.has(serviceCode)) {
          serviceMap.set(serviceCode, {
            carrierServiceCode: serviceCode,
            carrierServiceName: serviceName,
            universalServiceReference: transport.universalServiceReference,
            vesselSchedules: [],
            pointToPointRoutes: [],
          });
        }

        const schedule = serviceMap.get(serviceCode)!;
        const vesselIMO = vessel.vesselIMONumber || '0000000';

        // Find or create vessel schedule
        let vesselSchedule = schedule.vesselSchedules.find(
          (vs) => vs.vessel?.vesselIMONumber === vesselIMO
        );

        if (!vesselSchedule) {
          vesselSchedule = {
            isDummyVessel: vesselIMO === '0000000',
            vessel: {
              vesselIMONumber: vesselIMO,
              name: vessel.name,
              MMSINumber: vessel.MMSINumber,
              flag: vessel.flag,
              callSign: vessel.callSign,
              operatorCarrierCode: vessel.operatorCarrierCode,
              operatorCarrierCodeListProvider: vessel.operatorCarrierCodeListProvider,
            },
            transportCalls: [],
          };
          schedule.vesselSchedules.push(vesselSchedule);
        }

        // Add transport call from leg departure/arrival
        const transportCall = {
          transportCallReference: transport.transportCallReference || `ptp-${route.solutionNumber || 'unknown'}-${leg.sequenceNumber}`,
          portVisitReference: transport.portVisitReference,
          carrierImportVoyageNumber: servicePartner?.carrierImportVoyageNumber || 'UNKNOWN',
          carrierExportVoyageNumber: servicePartner?.carrierExportVoyageNumber || 'UNKNOWN',
          universalImportVoyageReference: transport.universalImportVoyageReference,
          universalExportVoyageReference: transport.universalExportVoyageReference,
          location: {
            UNLocationCode: leg.departure.location.UNLocationCode || leg.arrival.location.UNLocationCode,
            locationName: leg.departure.location.locationName || leg.arrival.location.locationName,
            address: leg.departure.location.address || leg.arrival.location.address,
            facilitySMDGCode: leg.departure.location.facility?.facilityCodeListProvider === 'SMDG'
              ? leg.departure.location.facility.facilityCode
              : leg.arrival.location.facility?.facilityCodeListProvider === 'SMDG'
              ? leg.arrival.location.facility.facilityCode
              : undefined,
          },
          timestamps: [
            {
              eventTypeCode: 'DEPA' as const,
              eventClassifierCode: 'EST' as const,
              eventDateTime: leg.departure.dateTime,
            },
            {
              eventTypeCode: 'ARRI' as const,
              eventClassifierCode: 'EST' as const,
              eventDateTime: leg.arrival.dateTime,
            },
          ],
          cutOffTimes: route.cutOffTimes,
        };

        if (vesselSchedule.transportCalls) {
          vesselSchedule.transportCalls.push(transportCall);
        }
      }

      // Preserve original Point-to-Point route information
      // Add route metadata to the primary service code for this route
      const routeSchedule = serviceMap.get(routeServiceCode);
      if (routeSchedule && routeSchedule.pointToPointRoutes) {
        // Check if this route is already added (by solutionNumber)
        const existingRoute = routeSchedule.pointToPointRoutes.find(
          (r) => r.solutionNumber === route.solutionNumber
        );
        if (!existingRoute) {
          routeSchedule.pointToPointRoutes.push({
            placeOfReceipt: route.placeOfReceipt,
            placeOfDelivery: route.placeOfDelivery,
            receiptTypeAtOrigin: route.receiptTypeAtOrigin,
            deliveryTypeAtDestination: route.deliveryTypeAtDestination,
            cutOffTimes: route.cutOffTimes,
            solutionNumber: route.solutionNumber,
            routingReference: route.routingReference,
            transitTime: route.transitTime,
          });
        }
      }
    }

    // Filter out services with no vessel schedules
    return Array.from(serviceMap.values()).filter(
      (schedule) => schedule.vesselSchedules.length > 0
    ) as ServiceSchedule[];
  }
}

