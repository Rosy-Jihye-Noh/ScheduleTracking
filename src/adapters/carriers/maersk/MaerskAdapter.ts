/**
 * Maersk Carrier Adapter
 * Main adapter combining Schedule and Tracking capabilities
 */

import { CarrierAdapter } from '@adapters/carriers/base/CarrierAdapter';
import { ScheduleQueryParams, ServiceSchedule } from '@domain/models/schedule';
import { TrackingQueryParams, TrackingEvent } from '@domain/models/tracking';
import { MaerskScheduleAdapter } from './MaerskScheduleAdapter';
import { MaerskPointToPointAdapter } from './MaerskPointToPointAdapter';
import { MaerskPortScheduleAdapter } from './MaerskPortScheduleAdapter';
import { MaerskTrackingAdapter } from './MaerskTrackingAdapter';
import { ConfigLoader } from '@infrastructure/config/ConfigLoader';
import { Logger } from '@infrastructure/logger/Logger';

/**
 * Maersk Carrier Adapter
 * Combines Schedule and Tracking adapters
 * Automatically selects the appropriate Schedule API based on query parameters:
 * - Point-to-Point Routes: if placeOfReceipt and placeOfDelivery are provided
 * - Port Schedule: if UNLocationCode and date are provided (without other vessel-specific params)
 * - Vessel Schedule: default for other queries
 */
export class MaerskAdapter implements CarrierAdapter {
  private scheduleAdapter: MaerskScheduleAdapter;
  private pointToPointAdapter: MaerskPointToPointAdapter;
  private portScheduleAdapter: MaerskPortScheduleAdapter;
  private trackingAdapter: MaerskTrackingAdapter;
  private carrierCode = 'MAERSK';
  private carrierName = 'Maersk';

  constructor() {
    this.scheduleAdapter = new MaerskScheduleAdapter();
    this.pointToPointAdapter = new MaerskPointToPointAdapter();
    this.portScheduleAdapter = new MaerskPortScheduleAdapter();
    this.trackingAdapter = new MaerskTrackingAdapter();
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
   * Automatically selects between Point-to-Point Routes, Port Schedule, and Vessel Schedule based on parameters
   * @param params Query parameters
   * @returns Array of service schedules
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
    const placeOfReceipt = (params as any).placeOfReceipt;
    const placeOfDelivery = (params as any).placeOfDelivery;
    const date = (params as any).date;
    const vesselIMONumber = params.vesselIMONumber;
    const carrierVoyageNumber = params.carrierVoyageNumber;
    const carrierServiceCode = params.carrierServiceCode;

    // Priority 1: Point-to-Point Routes API
    if (placeOfReceipt && placeOfDelivery) {
      Logger.info(`Maersk: Using Point-to-Point Routes API`, {
        carrier: this.carrierCode,
        placeOfReceipt,
        placeOfDelivery,
      });
      return this.pointToPointAdapter.getSchedule(params);
    }

    // Priority 2: Port Schedule API
    // Use Port Schedule if UNLocationCode and date are provided, and no vessel-specific params
    if (params.UNLocationCode && (date || params.startDate) && !vesselIMONumber && !carrierVoyageNumber && !carrierServiceCode) {
      Logger.info(`Maersk: Using Port Schedule API`, {
        carrier: this.carrierCode,
        UNLocationCode: params.UNLocationCode,
        date: date || params.startDate,
      });
      return this.portScheduleAdapter.getSchedule(params);
    }

    // Priority 3: Default to Vessel Schedule API
    Logger.info(`Maersk: Using Vessel Schedule API`, {
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

