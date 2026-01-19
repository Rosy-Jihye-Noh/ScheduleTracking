/**
 * HMM Schedule Mapper
 * Maps HMM's proprietary Schedule API response to DCSA ServiceSchedule model
 */

import { ServiceSchedule, VesselSchedule, TransportCall, Timestamp } from '@domain/models/schedule';

/**
 * HMM Schedule API Response Structure
 */
interface HMMScheduleResponse {
  resultData?: HMMScheduleItem[];
  resultCode?: string;
  resultMessage?: string;
}

interface HMMScheduleItem {
  vvdCode?: string;
  portCode?: string;
  portName?: string;
  tmnlCode?: string;
  tmnlName?: string;
  vesselName?: string;
  scheduleDirectionCode?: string;
  longTermDeparture?: {
    longTermDate?: string;
    longTermTime?: string;
  };
  arrival?: {
    arrivalDate?: string;
    arrivalTime?: string;
    arrivalStatusCode?: string;
  };
  berthing?: {
    berthingDate?: string;
    berthingTime?: string;
    berthingStatusCode?: string;
  };
  departure?: {
    departureDate?: string;
    departureTime?: string;
    departureStatusCode?: string;
  };
}

/**
 * Map HMM Schedule response to DCSA ServiceSchedule array
 * @param hmmResponse HMM API response
 * @param carrierServiceCode Optional service code (if known)
 * @returns Array of DCSA ServiceSchedule
 */
export function mapHMMScheduleToDCSA(
  hmmResponse: HMMScheduleResponse,
  carrierServiceCode?: string
): ServiceSchedule[] {
  if (!hmmResponse.resultData || !Array.isArray(hmmResponse.resultData) || hmmResponse.resultData.length === 0) {
    return [];
  }

  // Group by vvdCode (voyage) to create ServiceSchedule entries
  const voyageMap = new Map<string, HMMScheduleItem[]>();

  for (const item of hmmResponse.resultData) {
    const vvdCode = item.vvdCode || 'UNKNOWN';
    if (!voyageMap.has(vvdCode)) {
      voyageMap.set(vvdCode, []);
    }
    voyageMap.get(vvdCode)!.push(item);
  }

  const serviceSchedules: ServiceSchedule[] = [];

  for (const [vvdCode, items] of voyageMap.entries()) {
    // Extract service code from vvdCode if possible (first few characters)
    const serviceCode = carrierServiceCode || extractServiceCodeFromVVD(vvdCode);

    // Group items by vessel to create VesselSchedule entries
    const vesselMap = new Map<string, HMMScheduleItem[]>();
    for (const item of items) {
      const vesselName = item.vesselName || 'UNKNOWN';
      if (!vesselMap.has(vesselName)) {
        vesselMap.set(vesselName, []);
      }
      vesselMap.get(vesselName)!.push(item);
    }

    const vesselSchedules: VesselSchedule[] = [];

    for (const [vesselName, vesselItems] of vesselMap.entries()) {
      const transportCalls: TransportCall[] = [];

      // Sort items by sequence (if available) or by arrival date
      const sortedItems = [...vesselItems].sort((a, b) => {
        const dateA = a.arrival?.arrivalDate || a.departure?.departureDate || '';
        const dateB = b.arrival?.arrivalDate || b.departure?.departureDate || '';
        return dateA.localeCompare(dateB);
      });

      for (const item of sortedItems) {
        const timestamps: Timestamp[] = [];

        // Add arrival timestamp
        if (item.arrival?.arrivalDate && item.arrival?.arrivalTime) {
          timestamps.push({
            eventTypeCode: 'ARRI',
            eventClassifierCode: mapStatusCodeToClassifier(item.arrival.arrivalStatusCode),
            eventDateTime: convertHMMDateTime(item.arrival.arrivalDate, item.arrival.arrivalTime),
          });
        }

        // Add departure timestamp
        if (item.departure?.departureDate && item.departure?.departureTime) {
          timestamps.push({
            eventTypeCode: 'DEPA',
            eventClassifierCode: mapStatusCodeToClassifier(item.departure.departureStatusCode),
            eventDateTime: convertHMMDateTime(item.departure.departureDate, item.departure.departureTime),
          });
        }

        // If no timestamps, skip this transport call
        if (timestamps.length === 0) {
          continue;
        }

        const transportCall: TransportCall = {
          transportCallReference: generateTransportCallReference(vvdCode, item.portCode || ''),
          carrierImportVoyageNumber: vvdCode,
          carrierExportVoyageNumber: vvdCode,
          location: {
            UNLocationCode: item.portCode,
            locationName: item.portName,
            facilitySMDGCode: item.tmnlCode,
          },
          timestamps: timestamps,
        };

        transportCalls.push(transportCall);
      }

      const vesselSchedule: VesselSchedule = {
        isDummyVessel: vesselName === 'UNKNOWN',
        vessel: vesselName !== 'UNKNOWN'
          ? {
              vesselIMONumber: '0000000', // HMM API doesn't provide IMO, using placeholder
              name: vesselName,
            }
          : undefined,
        transportCalls: transportCalls.length > 0 ? transportCalls : undefined,
      };

      vesselSchedules.push(vesselSchedule);
    }

    const serviceSchedule: ServiceSchedule = {
      carrierServiceCode: serviceCode,
      carrierServiceName: serviceCode, // HMM doesn't provide service name, use code
      vesselSchedules: vesselSchedules,
    };

    serviceSchedules.push(serviceSchedule);
  }

  return serviceSchedules;
}

/**
 * Convert HMM date/time format to ISO 8601
 * HMM format: "20210817" + "2100" -> "2021-08-17T21:00:00Z"
 * @param dateStr Date string in format "YYYYMMDD"
 * @param timeStr Time string in format "HHMM"
 * @returns ISO 8601 datetime string
 */
function convertHMMDateTime(dateStr: string, timeStr: string): string {
  if (!dateStr || dateStr.length !== 8) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYYMMDD`);
  }

  if (!timeStr || timeStr.length !== 4) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HHMM`);
  }

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const hour = timeStr.substring(0, 2);
  const minute = timeStr.substring(2, 4);

  // Create ISO 8601 string (UTC)
  return `${year}-${month}-${day}T${hour}:${minute}:00Z`;
}

/**
 * Map HMM status code to DCSA event classifier code
 * @param statusCode HMM status code (e.g., "L" for Long-term, "A" for Actual, "E" for Estimated)
 * @returns DCSA event classifier code
 */
function mapStatusCodeToClassifier(statusCode?: string): 'ACT' | 'EST' | 'PLN' {
  if (!statusCode) {
    return 'EST';
  }

  const code = statusCode.toUpperCase();
  if (code === 'A' || code === 'ACTUAL') {
    return 'ACT';
  } else if (code === 'E' || code === 'ESTIMATED') {
    return 'EST';
  } else if (code === 'L' || code === 'LONG-TERM' || code === 'PLANNED') {
    return 'PLN';
  }

  return 'EST'; // Default to EST
}

/**
 * Extract service code from VVD code
 * VVD code format varies, try to extract meaningful service identifier
 * @param vvdCode VVD code
 * @returns Service code
 */
function extractServiceCodeFromVVD(vvdCode: string): string {
  // Try to extract service code from VVD (first few characters before numbers)
  const match = vvdCode.match(/^([A-Z]+)/);
  if (match) {
    return match[1];
  }
  return vvdCode.substring(0, Math.min(11, vvdCode.length));
}

/**
 * Generate transport call reference
 * @param vvdCode Voyage code
 * @param portCode Port code
 * @returns Transport call reference
 */
function generateTransportCallReference(vvdCode: string, portCode: string): string {
  return `HMM-${vvdCode}-${portCode}-${Date.now()}`;
}

