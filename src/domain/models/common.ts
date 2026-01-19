/**
 * Common domain models used across Schedule and Tracking
 * Based on DCSA standards
 */

/**
 * UN Location Code - 5 character code (2 country + 3 location)
 * Pattern: ^[A-Z]{2}[A-Z2-9]{3}$
 */
export type UNLocationCode = string;

/**
 * Facility Code - Code for identifying a specific facility
 */
export interface Facility {
  facilityCode: string; // Max 6 chars, does not include UN Location Code
  facilityCodeListProvider: 'BIC' | 'SMDG';
}

/**
 * Location - Can be specified using Address, UNLocationCode, or Facility
 */
export interface Location {
  locationName?: string; // Max 100 chars
  UNLocationCode?: UNLocationCode;
  address?: Address;
  facility?: Facility;
  latitude?: string;
  longitude?: string;
}

/**
 * Address information
 */
export interface Address {
  street: string; // Max 70 chars
  streetNumber?: string; // Max 50 chars
  floor?: string; // Max 50 chars
  postCode?: string; // Max 10 chars
  city: string; // Max 35 chars
  stateRegion?: string; // Max 65 chars
  countryCode: string; // ISO 3166-1 alpha-2, 2 chars
}

/**
 * Vessel information
 */
export interface Vessel {
  vesselIMONumber: string; // 7-8 digits, pattern: ^\d{7,8}$
  name?: string; // Max 50 chars
  flag?: string; // ISO 3166-1 alpha-2, 2 chars
  callSign?: string; // Max 10 chars
  MMSINumber?: string; // 9 digits
  operatorCarrierCode?: string; // Max 10 chars
  operatorCarrierCodeListProvider?: 'SMDG' | 'NMFTA';
}

/**
 * Service Partner - Carrier information in a service
 */
export interface ServicePartner {
  carrierCode?: string; // Max 4 chars
  carrierCodeListProvider?: 'SMDG' | 'NMFTA';
  carrierServiceCode?: string; // Max 11 chars
  carrierServiceName?: string; // Max 50 chars
  carrierImportVoyageNumber?: string; // Max 50 chars
  carrierExportVoyageNumber?: string; // Max 50 chars
}

