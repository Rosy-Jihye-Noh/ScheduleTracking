/**
 * Tracking domain models based on DCSA Track & Trace v2.2.0 standard
 */

import { Vessel, Location } from './common';

/**
 * Event Type - Type of tracking event
 */
export type EventType = 'SHIPMENT' | 'TRANSPORT' | 'EQUIPMENT';

/**
 * Event Classifier Code
 */
export type EventClassifierCode = 'ACT' | 'EST' | 'PLN';

/**
 * Transport Event Type Code
 */
export type TransportEventTypeCode = 'ARRI' | 'DEPA';

/**
 * Shipment Event Type Code
 */
export type ShipmentEventTypeCode =
  | 'RECE' // Received
  | 'DRFT' // Drafted
  | 'PENA' // Pending Approval
  | 'PENU' // Pending Update
  | 'REJE' // Rejected
  | 'APPR' // Approved
  | 'ISSU' // Issued
  | 'SURR' // Surrendered
  | 'SUBM' // Submitted
  | 'VOID' // Void
  | 'CONF' // Confirmed
  | 'REQS' // Requested
  | 'CMPL' // Completed
  | 'HOLD' // On Hold
  | 'RELS'; // Released

/**
 * Document Type Code
 */
export type DocumentTypeCode =
  | 'CBR' // Carrier Booking Request Reference
  | 'BKG' // Booking
  | 'SHI' // Shipping Instruction
  | 'SRM' // Shipment Release Message
  | 'TRD' // Transport Document
  | 'ARN' // Arrival Notice
  | 'VGM' // Verified Gross Mass
  | 'CAS' // Cargo Survey
  | 'CUS' // Customs Inspection
  | 'DGD' // Dangerous Goods Declaration
  | 'OOG'; // Out of Gauge

/**
 * Equipment Event Type Code
 */
export type EquipmentEventTypeCode =
  | 'LOAD' // Loaded
  | 'DISC' // Discharged
  | 'GTIN' // Gated in
  | 'GTOT' // Gated out
  | 'STUF' // Stuffed
  | 'STRP' // Stripped
  | 'PICK' // Pick-up
  | 'DROP' // Drop-off
  | 'INSP' // Inspected
  | 'RSEA' // Resealed
  | 'RMVD'; // Removed

/**
 * Mode of Transport
 */
export type ModeOfTransport = 'VESSEL' | 'RAIL' | 'TRUCK' | 'BARGE';

/**
 * Empty Indicator Code
 */
export type EmptyIndicatorCode = 'EMPTY' | 'LADEN';

/**
 * Transport Call for Tracking
 */
export interface TransportCall {
  transportCallID: string; // Max 100 chars, unique identifier
  carrierServiceCode?: string;
  carrierVoyageNumber?: string;
  exportVoyageNumber?: string;
  importVoyageNumber?: string;
  transportCallSequenceNumber?: number;
  UNLocationCode?: string;
  facilityCode?: string;
  facilityCodeListProvider?: 'BIC' | 'SMDG';
  facilityTypeCode?: string;
  otherFacility?: string;
  modeOfTransport: ModeOfTransport;
  location?: Location;
  vessel?: Vessel;
}

/**
 * Document Reference
 */
export interface DocumentReference {
  documentReferenceType: string;
  documentReferenceValue: string;
}

/**
 * Reference - Shipper or freight forwarder reference
 */
export interface Reference {
  referenceType: 'FF' | 'SI' | 'PO' | 'CR' | 'AAO' | 'EQ' | 'LOAD' | 'ERT';
  referenceValue: string; // Max 100 chars
}

/**
 * Base Event - Common properties for all event types
 */
export interface BaseEvent {
  eventID?: string; // UUID
  eventCreatedDateTime: string; // ISO 8601 format
  eventType: EventType;
  eventClassifierCode: EventClassifierCode;
  eventDateTime: string; // ISO 8601 format
  carrierSpecificData?: Record<string, unknown>;
}

/**
 * Transport Event
 */
export interface TransportEvent extends BaseEvent {
  eventType: 'TRANSPORT';
  transportEventTypeCode: TransportEventTypeCode;
  transportCall: TransportCall;
  delayReasonCode?: string; // Max 3 chars
  changeRemark?: string; // Max 250 chars
  documentReferences?: DocumentReference[];
  references?: Reference[];
}

/**
 * Shipment Event
 */
export interface ShipmentEvent extends BaseEvent {
  eventType: 'SHIPMENT';
  shipmentEventTypeCode: ShipmentEventTypeCode;
  documentID: string;
  documentTypeCode: DocumentTypeCode;
  shipmentID?: string; // UUID
  reason?: string;
  references?: Reference[];
}

/**
 * Equipment Event
 */
export interface EquipmentEvent extends BaseEvent {
  eventType: 'EQUIPMENT';
  equipmentEventTypeCode: EquipmentEventTypeCode;
  equipmentReference?: string; // Max 15 chars, BIC ISO Container ID
  ISOEquipmentCode?: string; // Max 4 chars
  emptyIndicatorCode: EmptyIndicatorCode;
  eventLocation?: Location;
  transportCall?: TransportCall;
  documentReferences?: DocumentReference[];
  references?: Reference[];
  seals?: Seal[];
}

/**
 * Seal - Seal information for equipment
 */
export interface Seal {
  sealNumber: string; // Max 15 chars
  sealType: 'KLP' | 'BLT' | 'WIR';
  sealSource?: 'CAR' | 'SHI' | 'PHY' | 'VET' | 'CUS';
}

/**
 * Union type for all event types
 */
export type TrackingEvent = TransportEvent | ShipmentEvent | EquipmentEvent;

/**
 * Query parameters for Tracking API
 */
export interface TrackingQueryParams {
  // Event type filters
  eventType?: EventType[];
  shipmentEventTypeCode?: ShipmentEventTypeCode[];
  transportEventTypeCode?: TransportEventTypeCode[];
  equipmentEventTypeCode?: EquipmentEventTypeCode[];
  documentTypeCode?: DocumentTypeCode[];
  
  // Reference filters
  carrierBookingReference?: string;
  transportDocumentReference?: string;
  equipmentReference?: string;
  
  // Transport filters
  transportCallID?: string;
  vesselIMONumber?: string;
  exportVoyageNumber?: string;
  carrierServiceCode?: string;
  UNLocationCode?: string;
  
  // Date filters
  eventCreatedDateTime?: string; // ISO 8601 with optional operators (:gte, :gt, :lte, :lt, :eq)
  eventDateTime?: string;
  
  // Pagination
  limit?: number;
  cursor?: string;
  
  // CMA CGM specific
  behalfOf?: string; // Third Party customer code
}

