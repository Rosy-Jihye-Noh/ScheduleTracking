/**
 * ZIM Carrier Adapter
 * Main adapter combining Schedule and Tracking capabilities
 */

import { CarrierAdapter } from '@adapters/carriers/base/CarrierAdapter';
import { ScheduleQueryParams, ServiceSchedule } from '@domain/models/schedule';
import { TrackingQueryParams, TrackingEvent } from '@domain/models/tracking';
import { ZIMScheduleAdapter } from './ZIMScheduleAdapter';
import { ZIMTrackingAdapter } from './ZIMTrackingAdapter';
import { ConfigLoader } from '@infrastructure/config/ConfigLoader';

/**
 * ZIM Carrier Adapter
 * Combines Schedule and Tracking adapters
 */
export class ZIMAdapter implements CarrierAdapter {
  private scheduleAdapter: ZIMScheduleAdapter;
  private trackingAdapter: ZIMTrackingAdapter;
  private carrierCode = 'ZIM';
  private carrierName = 'ZIM';

  constructor() {
    this.scheduleAdapter = new ZIMScheduleAdapter();
    this.trackingAdapter = new ZIMTrackingAdapter();
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
   * Note: ZIM only supports Point-to-Point schedules
   * @param params Query parameters
   * @returns Array of service schedules
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
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

