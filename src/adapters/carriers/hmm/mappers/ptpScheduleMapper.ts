/**
 * HMM PTP Schedule Mapper
 * Maps HMM's Point-to-Point Schedule API response to DCSA ServiceSchedule model
 */

import { ServiceSchedule, VesselSchedule, TransportCall, Timestamp } from '@domain/models/schedule';

/**
 * HMM PTP Schedule API Response Structure
 */
interface HMMPTPScheduleResponse {
  resultData?: HMMPTPScheduleItem[];
  resultCode?: string;
  resultMessage?: string;
}

interface HMMPTPScheduleItem {
  globaRouteMapNo?: string;
  loadingPortName?: string;
  loadingPortCode?: string;
  loadingTerminalName?: string;
  loadingTerminalCode?: string;
  vesselOperatorName?: string;
  departureDate?: string; // ISO format: "2021-12-03T14:49:00"
  transshipPortName?: string;
  transshipPortCode?: string;
  transshipTerminalName?: string;
  transshipTerminalCode?: string;
  arrivalDate?: string; // ISO format: "2022-01-30T20:40:00"
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
}

/**
 * Map HMM PTP Schedule response to DCSA ServiceSchedule array
 * @param hmmResponse HMM API response
 * @param _fromLocationCode Origin location code (for future use)
 * @param _toLocationCode Destination location code (for future use)
 * @returns Array of DCSA ServiceSchedule
 */
export function mapHMMPTPScheduleToDCSA(
  hmmResponse: HMMPTPScheduleResponse,
  _fromLocationCode: string,
  _toLocationCode: string
): ServiceSchedule[] {
  if (!hmmResponse.resultData || !Array.isArray(hmmResponse.resultData) || hmmResponse.resultData.length === 0) {
    return [];
  }

  const serviceSchedules: ServiceSchedule[] = [];

  for (const item of hmmResponse.resultData) {
    const transportCalls: TransportCall[] = [];

    // Create transport call for loading port (origin)
    if (item.loadingPortCode && item.departureDate) {
      const loadingTimestamps: Timestamp[] = [];
      
      // Add departure timestamp
      loadingTimestamps.push({
        eventTypeCode: 'DEPA',
        eventClassifierCode: 'EST', // Default to EST
        eventDateTime: normalizeDateTime(item.departureDate),
      });

      transportCalls.push({
        transportCallReference: generateTransportCallReference(item.globaRouteMapNo || '', item.loadingPortCode, 'LOADING'),
        carrierImportVoyageNumber: extractVoyageNumber(item.vessel),
        carrierExportVoyageNumber: extractVoyageNumber(item.vessel),
        location: {
          UNLocationCode: item.loadingPortCode,
          locationName: item.loadingPortName,
          facilitySMDGCode: item.loadingTerminalCode,
        },
        timestamps: loadingTimestamps,
      });
    }

    // Create transport call for transshipment port (if exists)
    if (item.transshipPortCode && item.transshipPortCode !== item.loadingPortCode && item.transshipPortCode !== item.dischargePortCode) {
      const transshipTimestamps: Timestamp[] = [];
      
      // Try to get arrival/departure from vessel array
      const transshipVessel = item.vessel?.find(v => v.dischargePort?.includes(item.transshipPortName || ''));
      if (transshipVessel?.vesselArrivalDate) {
        transshipTimestamps.push({
          eventTypeCode: 'ARRI',
          eventClassifierCode: 'EST',
          eventDateTime: normalizeDateTime(transshipVessel.vesselArrivalDate),
        });
      }
      if (transshipVessel?.vesselDepartureDate) {
        transshipTimestamps.push({
          eventTypeCode: 'DEPA',
          eventClassifierCode: 'EST',
          eventDateTime: normalizeDateTime(transshipVessel.vesselDepartureDate),
        });
      }

      if (transshipTimestamps.length > 0) {
        transportCalls.push({
          transportCallReference: generateTransportCallReference(item.globaRouteMapNo || '', item.transshipPortCode, 'TRANSSHIP'),
          carrierImportVoyageNumber: extractVoyageNumber(item.vessel, 2),
          carrierExportVoyageNumber: extractVoyageNumber(item.vessel, 2),
          location: {
            UNLocationCode: item.transshipPortCode,
            locationName: item.transshipPortName,
            facilitySMDGCode: item.transshipTerminalCode,
          },
          timestamps: transshipTimestamps,
        });
      }
    }

    // Create transport call for discharge port (destination)
    if (item.dischargePortCode && item.arrivalDate) {
      const dischargeTimestamps: Timestamp[] = [];
      
      // Add arrival timestamp
      dischargeTimestamps.push({
        eventTypeCode: 'ARRI',
        eventClassifierCode: 'EST',
        eventDateTime: normalizeDateTime(item.arrivalDate),
      });

      transportCalls.push({
        transportCallReference: generateTransportCallReference(item.globaRouteMapNo || '', item.dischargePortCode, 'DISCHARGE'),
        carrierImportVoyageNumber: extractVoyageNumber(item.vessel, item.vessel?.length || 1),
        carrierExportVoyageNumber: extractVoyageNumber(item.vessel, item.vessel?.length || 1),
        location: {
          UNLocationCode: item.dischargePortCode,
          locationName: item.dischargePortName,
          facilitySMDGCode: item.dischargeTerminalCode,
        },
        timestamps: dischargeTimestamps,
      });
    }

    // Group vessels by service/loop
    const vesselMap = new Map<string, HMMPTPScheduleItem['vessel']>();
    const serviceCode = item.vessel?.[0]?.vesselLoop || item.vesselOperatorName || 'UNKNOWN';
    
    if (!vesselMap.has(serviceCode)) {
      vesselMap.set(serviceCode, item.vessel || []);
    }

    // Create vessel schedules
    const vesselSchedules: VesselSchedule[] = [];
    
    for (const [_service, vessels] of vesselMap.entries()) {
      // For PTP, we create one vessel schedule per route
      const vesselNames = vessels
        ?.filter(v => v.vesselName)
        .map(v => v.vesselName!)
        .join(', ') || 'UNKNOWN';

      vesselSchedules.push({
        isDummyVessel: vesselNames === 'UNKNOWN',
        vessel: vesselNames !== 'UNKNOWN'
          ? {
              vesselIMONumber: '0000000', // HMM API doesn't provide IMO
              name: vesselNames,
            }
          : undefined,
        transportCalls: transportCalls.length > 0 ? transportCalls : undefined,
      });
    }

    const serviceSchedule: ServiceSchedule = {
      carrierServiceCode: serviceCode,
      carrierServiceName: item.vesselOperatorName || serviceCode,
      vesselSchedules: vesselSchedules,
    };

    serviceSchedules.push(serviceSchedule);
  }

  return serviceSchedules;
}

/**
 * Normalize datetime string to ISO 8601 format
 * @param dateTime DateTime string (may be ISO format or other)
 * @returns ISO 8601 datetime string
 */
function normalizeDateTime(dateTime: string): string {
  if (!dateTime) {
    throw new Error('Invalid datetime string');
  }

  // If already in ISO format, return as is (ensure Z suffix)
  if (dateTime.includes('T')) {
    return dateTime.endsWith('Z') ? dateTime : dateTime + 'Z';
  }

  // Try to parse and convert
  const date = new Date(dateTime);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid datetime format: ${dateTime}`);
  }

  return date.toISOString();
}

/**
 * Extract voyage number from vessel array
 * @param vessels Vessel array
 * @param index Vessel index (1-based)
 * @returns Voyage number or empty string
 */
function extractVoyageNumber(vessels?: HMMPTPScheduleItem['vessel'], index: number = 1): string {
  if (!vessels || vessels.length === 0) {
    return '';
  }
  
  const vessel = vessels[index - 1];
  return vessel?.voyageNumber || vessel?.vesselCode || '';
}

/**
 * Generate transport call reference
 * @param routeMapNo Route map number
 * @param portCode Port code
 * @param type Call type
 * @returns Transport call reference
 */
function generateTransportCallReference(routeMapNo: string, portCode: string, type: string): string {
  return `HMM-PTP-${routeMapNo}-${portCode}-${type}-${Date.now()}`;
}

