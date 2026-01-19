/**
 * CMA CGM Carrier Adapter
 * Main adapter combining Schedule and Tracking capabilities
 * 
 * Supports multiple Schedule APIs:
 * - Commercial Schedule (DCSA): vesseloperation.commercialschedule.v1
 * - Proforma (Lines & Services): vesseloperation.proforma.v2
 * - Voyage: vesseloperation.voyage.v2
 * - Route (Routing Finder): vesseloperation.route.v2
 */

import { CarrierAdapter } from '@adapters/carriers/base/CarrierAdapter';
import { ScheduleQueryParams, ServiceSchedule } from '@domain/models/schedule';
import { TrackingQueryParams, TrackingEvent } from '@domain/models/tracking';
import { CMACGMScheduleAdapter } from './CMACGMScheduleAdapter';
import { CMACGMProformaAdapter } from './CMACGMProformaAdapter';
import { CMACGMVoyageAdapter } from './CMACGMVoyageAdapter';
import { CMACGMRouteAdapter } from './CMACGMRouteAdapter';
import { CMACGMTrackingAdapter } from './CMACGMTrackingAdapter';
import { ConfigLoader } from '@infrastructure/config/ConfigLoader';
import { Logger } from '@infrastructure/logger/Logger';

/**
 * CMA CGM Carrier Adapter
 * Combines Schedule and Tracking adapters
 * Automatically selects the appropriate Schedule API based on query parameters
 */
export class CMACGMAdapter implements CarrierAdapter {
  private scheduleAdapter: CMACGMScheduleAdapter;
  private proformaAdapter: CMACGMProformaAdapter;
  private voyageAdapter: CMACGMVoyageAdapter;
  private routeAdapter: CMACGMRouteAdapter;
  private trackingAdapter: CMACGMTrackingAdapter;
  private carrierCode = 'CMCG';
  private carrierName = 'CMA CGM';

  constructor() {
    this.scheduleAdapter = new CMACGMScheduleAdapter();
    this.proformaAdapter = new CMACGMProformaAdapter();
    this.voyageAdapter = new CMACGMVoyageAdapter();
    this.routeAdapter = new CMACGMRouteAdapter();
    this.trackingAdapter = new CMACGMTrackingAdapter();
  }

  /**
   * Get carrier code
   * @returns Carrier code
   */
  getCarrierCode(): string {
    return this.carrierCode;
  }

  /**
   * Get carrier name
   * @returns Carrier name
   */
  getCarrierName(): string {
    return this.carrierName;
  }

  /**
   * Check if adapter is available
   * @returns true if adapter is ready to use
   */
  isAvailable(): boolean {
    try {
      const config = ConfigLoader.loadCarrierConfig(this.carrierCode);
      return config.enabled !== false;
    } catch {
      return false;
    }
  }

  /**
   * Get vessel schedules
   * Automatically selects the appropriate API based on query parameters:
   * - Route API: If placeOfLoading/unLocodePlaceOfLoading and placeOfDischarge/unLocodePlaceOfDischarge are provided
   * - Proforma API: If serviceCode, lineCode, or zoneFromCode/zoneToCode are provided (HIGH PRIORITY)
   * - Voyage API: If voyageCode, vesselIMO, or (from/to dates) or (portCode/countryCode) are provided
   * - Commercial Schedule API: Default fallback (DCSA standard)
   * 
   * @param params Query parameters
   * @returns Array of service schedules
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
    const placeOfLoading = (params as any).placeOfLoading;
    const placeOfDischarge = (params as any).placeOfDischarge;
    const unLocodePlaceOfLoading = (params as any).unLocodePlaceOfLoading;
    const unLocodePlaceOfDischarge = (params as any).unLocodePlaceOfDischarge;
    const voyageCode = (params as any).voyageCode || params.carrierVoyageNumber;
    const vesselIMO = (params as any).vesselIMO || params.vesselIMONumber;
    const from = (params as any).from || params.startDate;
    const to = (params as any).to || params.endDate;
    const portCode = (params as any).portCode;
    const countryCode = (params as any).countryCode;
    const serviceCode = (params as any).serviceCode || params.carrierServiceCode;
    const lineCode = (params as any).lineCode;
    const zoneFromCode = (params as any).zoneFromCode;
    const zoneToCode = (params as any).zoneToCode;

    // Priority 1: Route API (Port-to-Port routing)
    if ((placeOfLoading || unLocodePlaceOfLoading) && (placeOfDischarge || unLocodePlaceOfDischarge)) {
      Logger.info(`CMA CGM: Using Route API for port-to-port routing`, {
        carrier: this.carrierCode,
        placeOfLoading: placeOfLoading || unLocodePlaceOfLoading,
        placeOfDischarge: placeOfDischarge || unLocodePlaceOfDischarge,
      });
      return this.routeAdapter.getSchedule(params);
    }

    // Priority 2: Proforma API (Lines & Services) - Check BEFORE Voyage API
    // This ensures serviceCode/lineCode queries go to Proforma API
    if (serviceCode || lineCode || (zoneFromCode && zoneToCode)) {
      Logger.info(`CMA CGM: Using Proforma API for Lines & Services`, {
        carrier: this.carrierCode,
        serviceCode,
        lineCode,
        zoneFromCode,
        zoneToCode,
      });
      return this.proformaAdapter.getSchedule(params);
    }

    // Priority 3: Voyage API
    if (voyageCode || vesselIMO || (from && to) || portCode || countryCode) {
      Logger.info(`CMA CGM: Using Voyage API`, {
        carrier: this.carrierCode,
        voyageCode,
        vesselIMO,
        from,
        to,
        portCode,
        countryCode,
      });
      return this.voyageAdapter.getSchedule(params);
    }

    // Priority 4: Default to Commercial Schedule API (DCSA standard)
    Logger.info(`CMA CGM: Using Commercial Schedule API (DCSA)`, {
      carrier: this.carrierCode,
      params,
    });
    return this.scheduleAdapter.getSchedule(params);
  }

  /**
   * Get tracking events
   * @param params Query parameters
   * @returns Array of tracking events
   */
  async getTracking(params: TrackingQueryParams): Promise<TrackingEvent[]> {
    return this.trackingAdapter.getTracking(params);
  }
}

