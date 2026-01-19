/**
 * HMM Tracking Mapper
 * Maps HMM's proprietary Tracking API response to DCSA TrackingEvent model
 */

import { TrackingEvent, TransportEvent, ShipmentEvent, EquipmentEvent } from '@domain/models/tracking';

/**
 * HMM Tracking API Response Structure
 */
interface HMMTrackingResponse {
  shipment?: {
    eventID?: string;
    carrierBookingReference?: string;
    deliveryDateTime?: string;
    carrierID?: string;
  };
  transport?: {
    eventID?: string;
    transportName?: string;
    modeOfTransportCode?: string;
    loadTransportCallId?: string;
    dischargeTransportCallId?: string;
    vesselImoNumber?: string;
  };
  equipment?: {
    ISOEquipmentCode?: string;
  };
  shipmentEvent?: HMMShipmentEvent[];
  transportEvent?: HMMTransportEvent[];
  equipmentEvent?: HMMEquipmentEvent[];
  transportCall?: HMMTransportCall[];
}

interface HMMShipmentEvent {
  eventID?: string;
  eventCreatedDateTime?: string;
  eventType?: string;
  eventClassifierCode?: string;
  eventDateTime?: string;
  shipmentEventTypeCode?: string;
  documentId?: string;
  documentTypeCode?: string;
  shipmentID?: string;
  reason?: string;
  references?: Array<{ referenceType?: string; referenceValue?: string }>;
}

interface HMMTransportEvent {
  eventID?: string;
  eventCreatedDateTime?: string;
  eventType?: string;
  eventClassifierCode?: string;
  eventDateTime?: string;
  transportEventTypeCode?: string;
  transportCall?: HMMTransportCall;
  delayReasonCode?: string;
  changeRemark?: string;
  documentReferences?: Array<{ documentReferenceType?: string; documentReferenceValue?: string }>;
  references?: Array<{ referenceType?: string; referenceValue?: string }>;
}

interface HMMEquipmentEvent {
  eventID?: string;
  eventCreatedDateTime?: string;
  eventType?: string;
  eventClassifierCode?: string;
  eventDateTime?: string;
  equipmentEventTypeCode?: string;
  equipmentReference?: string;
  ISOEquipmentCode?: string;
  emptyIndicatorCode?: string;
  eventLocation?: string;
  transportCall?: HMMTransportCall;
  documentReferences?: Array<{ documentReferenceType?: string; documentReferenceValue?: string }>;
  references?: Array<{ referenceType?: string; referenceValue?: string }>;
  seals?: Array<{ sealNumber?: string; sealType?: string; sealSource?: string }>;
}

interface HMMTransportCall {
  transportCallID?: string;
  carrierServiceCode?: string;
  exportVoyageNumber?: string;
  importVoyageNumber?: string;
  transportCallSequenceNumber?: number;
  UNLocationCode?: string;
  facilityCode?: string;
  facilityTypeCode?: string;
  otherFacility?: string;
  modeOfTransport?: string;
  location?: string;
  vessel?: {
    vesselIMONumber?: string;
    vesselName?: string;
    vesselFlag?: string;
    vesselCallSignNumber?: string;
    vesselOperatorCarrierCode?: string;
  };
}

/**
 * Map HMM Tracking response to DCSA TrackingEvent array
 * @param hmmResponse HMM API response
 * @returns Array of DCSA TrackingEvent
 */
export function mapHMMTrackingToDCSA(hmmResponse: HMMTrackingResponse): TrackingEvent[] {
  const events: TrackingEvent[] = [];

  // Create a map of transportCallID to transportCall for quick lookup
  const transportCallMap = new Map<string, any>();
  if (hmmResponse.transportCall) {
    for (const tc of hmmResponse.transportCall) {
      if (tc.transportCallID) {
        transportCallMap.set(tc.transportCallID, mapHMMTransportCallToDCSA(tc));
      }
    }
  }

  // Map shipment events
  if (hmmResponse.shipmentEvent && Array.isArray(hmmResponse.shipmentEvent)) {
    for (const hmmEvent of hmmResponse.shipmentEvent) {
      const event: ShipmentEvent = {
        eventID: hmmEvent.eventID,
        eventCreatedDateTime: hmmEvent.eventCreatedDateTime || new Date().toISOString(),
        eventType: 'SHIPMENT',
        eventClassifierCode: (hmmEvent.eventClassifierCode as any) || 'EST',
        eventDateTime: hmmEvent.eventDateTime || hmmEvent.eventCreatedDateTime || new Date().toISOString(),
        shipmentEventTypeCode: (hmmEvent.shipmentEventTypeCode as any) || 'RECE',
        documentID: hmmEvent.documentId || '',
        documentTypeCode: (hmmEvent.documentTypeCode as any) || 'BKG',
        shipmentID: hmmEvent.shipmentID,
        reason: hmmEvent.reason,
        references: hmmEvent.references?.map(ref => ({
          referenceType: (ref.referenceType as any) || 'FF',
          referenceValue: ref.referenceValue || '',
        })),
      };
      events.push(event);
    }
  }

  // Map transport events
  if (hmmResponse.transportEvent && Array.isArray(hmmResponse.transportEvent)) {
    for (const hmmEvent of hmmResponse.transportEvent) {
      // Find transportCall by ID if available
      let transportCall = hmmEvent.transportCall
        ? mapHMMTransportCallToDCSA(hmmEvent.transportCall)
        : undefined;

      // If transportCall not in event, try to find it by ID from transportCall array
      if (!transportCall && hmmEvent.transportCall?.transportCallID) {
        transportCall = transportCallMap.get(hmmEvent.transportCall.transportCallID);
      }

      // If still no transportCall, create a minimal one
      if (!transportCall) {
        transportCall = {
          transportCallID: hmmEvent.transportCall?.transportCallID || `temp-${Date.now()}`,
          modeOfTransport: (hmmEvent.transportCall?.modeOfTransport as any) || 'VESSEL',
        };
      }

      const event: TransportEvent = {
        eventID: hmmEvent.eventID,
        eventCreatedDateTime: hmmEvent.eventCreatedDateTime || new Date().toISOString(),
        eventType: 'TRANSPORT',
        eventClassifierCode: (hmmEvent.eventClassifierCode as any) || 'EST',
        eventDateTime: hmmEvent.eventDateTime || hmmEvent.eventCreatedDateTime || new Date().toISOString(),
        transportEventTypeCode: (hmmEvent.transportEventTypeCode as any) || 'ARRI',
        transportCall: transportCall,
        delayReasonCode: hmmEvent.delayReasonCode,
        changeRemark: hmmEvent.changeRemark,
        documentReferences: hmmEvent.documentReferences?.map(ref => ({
          documentReferenceType: ref.documentReferenceType || 'BKG',
          documentReferenceValue: ref.documentReferenceValue || '',
        })),
        references: hmmEvent.references?.map(ref => ({
          referenceType: (ref.referenceType as any) || 'FF',
          referenceValue: ref.referenceValue || '',
        })),
      };
      events.push(event);
    }
  }

  // Map equipment events
  if (hmmResponse.equipmentEvent && Array.isArray(hmmResponse.equipmentEvent)) {
    for (const hmmEvent of hmmResponse.equipmentEvent) {
      // Find transportCall by ID if available
      let transportCall = hmmEvent.transportCall
        ? mapHMMTransportCallToDCSA(hmmEvent.transportCall)
        : undefined;

      // If transportCall not in event, try to find it by ID from transportCall array
      if (!transportCall && hmmEvent.transportCall?.transportCallID) {
        transportCall = transportCallMap.get(hmmEvent.transportCall.transportCallID);
      }

      // If still no transportCall, create a minimal one
      if (!transportCall) {
        transportCall = {
          transportCallID: hmmEvent.transportCall?.transportCallID || `temp-${Date.now()}`,
          modeOfTransport: (hmmEvent.transportCall?.modeOfTransport as any) || 'VESSEL',
        };
      }

      const event: EquipmentEvent = {
        eventID: hmmEvent.eventID,
        eventCreatedDateTime: hmmEvent.eventCreatedDateTime || new Date().toISOString(),
        eventType: 'EQUIPMENT',
        eventClassifierCode: (hmmEvent.eventClassifierCode as any) || 'EST',
        eventDateTime: hmmEvent.eventDateTime || hmmEvent.eventCreatedDateTime || new Date().toISOString(),
        equipmentEventTypeCode: (hmmEvent.equipmentEventTypeCode as any) || 'GTIN',
        equipmentReference: hmmEvent.equipmentReference,
        ISOEquipmentCode: hmmEvent.ISOEquipmentCode || hmmResponse.equipment?.ISOEquipmentCode,
        emptyIndicatorCode: (hmmEvent.emptyIndicatorCode?.toUpperCase() as any) || 'LADEN',
        eventLocation: hmmEvent.eventLocation
          ? {
              UNLocationCode: hmmEvent.eventLocation,
            }
          : undefined,
        transportCall: transportCall,
        documentReferences: hmmEvent.documentReferences?.map(ref => ({
          documentReferenceType: ref.documentReferenceType || 'BKG',
          documentReferenceValue: ref.documentReferenceValue || '',
        })),
        references: hmmEvent.references?.map(ref => ({
          referenceType: (ref.referenceType as any) || 'FF',
          referenceValue: ref.referenceValue || '',
        })),
        seals: hmmEvent.seals?.map(seal => ({
          sealNumber: seal.sealNumber || '',
          sealType: (seal.sealType as any) || 'WIR',
          sealSource: seal.sealSource as any,
        })),
      };
      events.push(event);
    }
  }

  return events;
}

/**
 * Map HMM TransportCall to DCSA TransportCall
 */
function mapHMMTransportCallToDCSA(hmmTc: HMMTransportCall): any {
  return {
    transportCallID: hmmTc.transportCallID || `temp-${Date.now()}`,
    carrierServiceCode: hmmTc.carrierServiceCode,
    exportVoyageNumber: hmmTc.exportVoyageNumber,
    importVoyageNumber: hmmTc.importVoyageNumber,
    transportCallSequenceNumber: hmmTc.transportCallSequenceNumber,
    UNLocationCode: hmmTc.UNLocationCode || hmmTc.location,
    facilityCode: hmmTc.facilityCode,
    facilityCodeListProvider: hmmTc.facilityCode ? 'SMDG' : undefined,
    facilityTypeCode: hmmTc.facilityTypeCode,
    otherFacility: hmmTc.otherFacility,
    modeOfTransport: (hmmTc.modeOfTransport?.toUpperCase() as any) || 'VESSEL',
    location: hmmTc.UNLocationCode || hmmTc.location
      ? {
          UNLocationCode: hmmTc.UNLocationCode || hmmTc.location,
        }
      : undefined,
    vessel: hmmTc.vessel
      ? {
          vesselIMONumber: hmmTc.vessel.vesselIMONumber || '',
          name: hmmTc.vessel.vesselName,
          flag: hmmTc.vessel.vesselFlag,
          callSign: hmmTc.vessel.vesselCallSignNumber,
          operatorCarrierCode: hmmTc.vessel.vesselOperatorCarrierCode,
        }
      : undefined,
  };
}

