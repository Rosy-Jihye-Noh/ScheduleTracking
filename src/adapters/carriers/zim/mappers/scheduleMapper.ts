/**
 * ZIM Schedule Mapper
 * Maps ZIM's proprietary Point-to-Point Schedule API response to DCSA ServiceSchedule model
 */

import { ServiceSchedule, VesselSchedule, TransportCall, Timestamp } from '@domain/models/schedule';

/**
 * ZIM Schedule API Response Structure
 */
interface ZIMScheduleResponse {
  response?: {
    routes?: ZIMRoute[];
  };
}

interface ZIMRoute {
  routeSequence?: number;
  departurePort?: string;
  departurePortName?: string;
  departureDate?: string;
  arrivalPort?: string;
  arrivalPortName?: string;
  arrivalDate?: string;
  transitTime?: number;
  routeLegCount?: number;
  routeLegs?: ZIMRouteLeg[];
}

interface ZIMRouteLeg {
  legOrder?: number;
  line?: string;
  departurePort?: string;
  departurePortName?: string;
  arrivalPort?: string;
  arrivalPortName?: string;
  departureDate?: string;
  arrivalDate?: string;
  vesselName?: string;
  vesselCode?: string;
  lloydsCode?: string;
  callSign?: string;
  voyage?: string;
  leg?: string;
  consortSailingNumber?: string;
  docClosingDate?: string;
  containerClosingDate?: string;
  vgmClosingDate?: string;
  firstGateInDate?: string;
  amsClosingDate?: string;
  usDocClosingDate?: string;
  reeferEntryPortCutOffDate?: string;
  hazardousDocsCutOff?: string;
  depotFrom?: string;
  depotTo?: string;
}

/**
 * Map ZIM Schedule response to DCSA ServiceSchedule array
 * ZIM only provides Point-to-Point schedules, so we convert them to ServiceSchedule format
 * @param zimResponse ZIM API response
 * @returns Array of DCSA ServiceSchedule
 */
export function mapZIMScheduleToDCSA(zimResponse: ZIMScheduleResponse): ServiceSchedule[] {
  if (!zimResponse.response?.routes || !Array.isArray(zimResponse.response.routes) || zimResponse.response.routes.length === 0) {
    return [];
  }

  const serviceSchedules: ServiceSchedule[] = [];

  // Group routes by service (line)
  const serviceMap = new Map<string, ZIMRoute[]>();

  for (const route of zimResponse.response.routes) {
    // Extract service code from route legs
    const serviceCode = extractServiceCode(route);
    if (!serviceMap.has(serviceCode)) {
      serviceMap.set(serviceCode, []);
    }
    serviceMap.get(serviceCode)!.push(route);
  }

  for (const [serviceCode, routes] of serviceMap.entries()) {
    const vesselSchedules: VesselSchedule[] = [];

    for (const route of routes) {
      if (!route.routeLegs || route.routeLegs.length === 0) {
        continue;
      }

      // Group legs by vessel to create VesselSchedule entries
      const vesselMap = new Map<string, ZIMRouteLeg[]>();

      for (const leg of route.routeLegs) {
        const vesselKey = `${leg.vesselName || 'UNKNOWN'}-${leg.lloydsCode || leg.vesselCode || ''}`;
        if (!vesselMap.has(vesselKey)) {
          vesselMap.set(vesselKey, []);
        }
        vesselMap.get(vesselKey)!.push(leg);
      }

      for (const [_vesselKey, legs] of vesselMap.entries()) {
        const transportCalls: TransportCall[] = [];

        // Sort legs by legOrder
        const sortedLegs = [...legs].sort((a, b) => (a.legOrder || 0) - (b.legOrder || 0));

        for (const leg of sortedLegs) {
          const timestamps: Timestamp[] = [];

          // Add arrival timestamp
          if (leg.arrivalDate) {
            timestamps.push({
              eventTypeCode: 'ARRI',
              eventClassifierCode: 'EST', // ZIM doesn't provide classifier, default to EST
              eventDateTime: leg.arrivalDate,
            });
          }

          // Add departure timestamp
          if (leg.departureDate) {
            timestamps.push({
              eventTypeCode: 'DEPA',
              eventClassifierCode: 'EST', // ZIM doesn't provide classifier, default to EST
              eventDateTime: leg.departureDate,
            });
          }

          if (timestamps.length === 0) {
            continue;
          }

          // Create cut-off times from ZIM's closing dates
          const cutOffTimes = [];
          if (leg.docClosingDate) {
            cutOffTimes.push({
              cutOffDateTimeCode: 'DCO',
              cutOffDateTime: leg.docClosingDate,
            });
          }
          if (leg.containerClosingDate) {
            cutOffTimes.push({
              cutOffDateTimeCode: 'FCO',
              cutOffDateTime: leg.containerClosingDate,
            });
          }
          if (leg.vgmClosingDate) {
            cutOffTimes.push({
              cutOffDateTimeCode: 'VCO',
              cutOffDateTime: leg.vgmClosingDate,
            });
          }

          const transportCall: TransportCall = {
            transportCallReference: generateTransportCallReference(leg),
            carrierImportVoyageNumber: leg.voyage || leg.consortSailingNumber || '',
            carrierExportVoyageNumber: leg.voyage || leg.consortSailingNumber || '',
            location: {
              UNLocationCode: leg.arrivalPort || leg.departurePort,
              locationName: leg.arrivalPortName || leg.departurePortName,
            },
            timestamps: timestamps,
            cutOffTimes: cutOffTimes.length > 0 ? cutOffTimes : undefined,
          };

          transportCalls.push(transportCall);
        }

        // Extract vessel information from first leg
        const firstLeg = sortedLegs[0];
        const vesselSchedule: VesselSchedule = {
          isDummyVessel: !firstLeg.vesselName || firstLeg.vesselName === 'UNKNOWN',
          vessel: firstLeg.vesselName && firstLeg.vesselName !== 'UNKNOWN'
            ? {
                vesselIMONumber: firstLeg.lloydsCode || '',
                name: firstLeg.vesselName,
                callSign: firstLeg.callSign,
              }
            : undefined,
          transportCalls: transportCalls.length > 0 ? transportCalls : undefined,
        };

        vesselSchedules.push(vesselSchedule);
      }
    }

    const serviceSchedule: ServiceSchedule = {
      carrierServiceCode: serviceCode,
      carrierServiceName: serviceCode, // ZIM doesn't provide service name, use code
      vesselSchedules: vesselSchedules,
    };

    serviceSchedules.push(serviceSchedule);
  }

  return serviceSchedules;
}

/**
 * Extract service code from route
 * @param route ZIM route
 * @returns Service code
 */
function extractServiceCode(route: ZIMRoute): string {
  // Try to get service code from route legs
  if (route.routeLegs && route.routeLegs.length > 0) {
    const line = route.routeLegs[0].line;
    if (line) {
      return line;
    }
  }
  // Fallback to a generated code
  return `ZIM-${route.departurePort || 'UNKNOWN'}-${route.arrivalPort || 'UNKNOWN'}`;
}

/**
 * Generate transport call reference
 * @param leg Route leg
 * @returns Transport call reference
 */
function generateTransportCallReference(leg: ZIMRouteLeg): string {
  const parts = [
    'ZIM',
    leg.departurePort || '',
    leg.arrivalPort || '',
    leg.voyage || leg.consortSailingNumber || '',
    leg.lloydsCode || leg.vesselCode || '',
  ].filter(Boolean);
  return parts.join('-') || `ZIM-${Date.now()}`;
}

