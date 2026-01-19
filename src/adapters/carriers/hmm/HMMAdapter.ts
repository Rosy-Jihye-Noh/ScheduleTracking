/**
 * HMM Carrier Adapter
 * Main adapter combining Schedule and Tracking capabilities
 */

import { CarrierAdapter } from '@adapters/carriers/base/CarrierAdapter';
import { ScheduleQueryParams, ServiceSchedule } from '@domain/models/schedule';
import { TrackingQueryParams, TrackingEvent } from '@domain/models/tracking';
import { HMMScheduleAdapter } from './HMMScheduleAdapter';
import { HMMPortScheduleAdapter } from './HMMPortScheduleAdapter';
import { HMMPTPScheduleAdapter } from './HMMPTPScheduleAdapter';
import { HMMTrackingAdapter } from './HMMTrackingAdapter';
import { ConfigLoader } from '@infrastructure/config/ConfigLoader';

/**
 * HMM Carrier Adapter
 * Combines Schedule and Tracking adapters
 */
export class HMMAdapter implements CarrierAdapter {
  private scheduleAdapter: HMMScheduleAdapter;
  private portScheduleAdapter: HMMPortScheduleAdapter;
  private ptpScheduleAdapter: HMMPTPScheduleAdapter;
  private trackingAdapter: HMMTrackingAdapter;
  private carrierCode = 'HMM';
  private carrierName = 'HMM';

  constructor() {
    this.scheduleAdapter = new HMMScheduleAdapter();
    this.portScheduleAdapter = new HMMPortScheduleAdapter();
    this.ptpScheduleAdapter = new HMMPTPScheduleAdapter();
    this.trackingAdapter = new HMMTrackingAdapter();
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
   * Automatically selects between Vessel Schedule, Port Schedule, and PTP Schedule based on parameters:
   * - If carrierVoyageNumber is provided: uses Vessel Schedule API
   * - If UNLocationCode + startDate + endDate are provided: uses Port Schedule API
   * - If fromLocationCode + toLocationCode + periodDate are provided: uses PTP Schedule API
   * @param params Query parameters
   * @returns Array of service schedules
   */
  async getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]> {
    // Check for PTP Schedule parameters (custom fields)
    const fromLocationCode = (params as any).fromLocationCode;
    const toLocationCode = (params as any).toLocationCode;
    const periodDate = (params as any).periodDate;

    // Determine which API to use based on parameters
    if (params.carrierVoyageNumber) {
      // Use Vessel Schedule API (requires vvdCode)
      return this.scheduleAdapter.getSchedule(params);
    } else if (fromLocationCode && toLocationCode && periodDate) {
      // Use PTP Schedule API (requires fromLocationCode, toLocationCode, periodDate)
      return this.ptpScheduleAdapter.getSchedule(params);
    } else if (params.UNLocationCode && params.startDate && params.endDate) {
      // Use Port Schedule API (requires portCode, durationFrom, durationTo)
      return this.portScheduleAdapter.getSchedule(params);
    } else {
      // If neither condition is met, try Vessel Schedule first (will throw error if vvdCode is required)
      // This maintains backward compatibility
      return this.scheduleAdapter.getSchedule(params);
    }
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

