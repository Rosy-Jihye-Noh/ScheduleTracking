/**
 * Schedule domain models based on DCSA Commercial Schedules standard
 * Supports Point-to-Point, Port Schedule, and Vessel Schedule
 */

import { Vessel } from './common';

/**
 * Event Type Code for timestamps
 */
export type EventTypeCode = 'ARRI' | 'DEPA';

/**
 * Event Classifier Code
 */
export type EventClassifierCode = 'ACT' | 'EST' | 'PLN';

/**
 * Timestamp - Represents arrival or departure events
 */
export interface Timestamp {
  eventTypeCode: EventTypeCode;
  eventClassifierCode: EventClassifierCode;
  eventDateTime: string; // ISO 8601 format with offset
}

/**
 * Cut-Off Time - Latest date/time by which a task must be completed
 */
export interface CutOffTime {
  cutOffDateTimeCode: string; // DCO, VCO, FCO, LCO, PCO, etc.
  cutOffDateTime: string; // ISO 8601 format
}

/**
 * Transport Call Location - Location for a transport call
 */
export interface TransportCallLocation {
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
  facilitySMDGCode?: string; // Max 6 chars
}

/**
 * Transport Call - A call at a port/facility
 */
export interface TransportCall {
  transportCallReference: string; // Max 100 chars, unique reference
  portVisitReference?: string; // Max 50 chars
  carrierImportVoyageNumber: string; // Max 50 chars, required
  carrierExportVoyageNumber?: string; // Max 50 chars
  universalImportVoyageReference?: string; // Pattern: ^\d{2}[0-9A-Z]{2}[NEWSR]$
  universalExportVoyageReference?: string; // Pattern: ^\d{2}[0-9A-Z]{2}[NEWSR]$
  location: TransportCallLocation;
  timestamps: Timestamp[]; // At least 1 required
  cutOffTimes?: CutOffTime[];
}

/**
 * Vessel Schedule - Schedule for a specific vessel
 */
export interface VesselSchedule {
  vessel?: Vessel;
  isDummyVessel: boolean; // true when no vessel assigned
  transportCalls?: TransportCall[];
}

/**
 * Service Schedule - Complete schedule for a service
 */
export interface ServiceSchedule {
  carrierServiceCode: string; // Max 11 chars, required
  carrierServiceName: string; // Max 50 chars, required
  universalServiceReference?: string; // Pattern: ^SR\d{5}[A-Z]$
  vesselSchedules: VesselSchedule[]; // At least 1 required
}

/**
 * Query parameters for Schedule API
 */
export interface ScheduleQueryParams {
  // Vessel filters
  vesselIMONumber?: string;
  vesselName?: string;
  
  // Service filters
  carrierServiceCode?: string;
  universalServiceReference?: string;
  
  // Voyage filters
  carrierVoyageNumber?: string;
  universalVoyageReference?: string;
  
  // Location filters
  UNLocationCode?: string;
  facilitySMDGCode?: string;
  
  // Other filters
  vesselOperatorCarrierCode?: string;
  startDate?: string; // ISO 8601 date format
  endDate?: string; // ISO 8601 date format
  
  // Pagination
  limit?: number;
  cursor?: string;
}

