/**
 * Carrier Adapter Base Interface
 * Main interface that all carrier adapters must implement
 */

import { ScheduleAdapter } from './ScheduleAdapter';
import { TrackingAdapter } from './TrackingAdapter';

/**
 * Base interface for carrier adapters
 * Combines Schedule and Tracking capabilities
 */
export interface CarrierAdapter extends ScheduleAdapter, TrackingAdapter {
  /**
   * Get the carrier code (e.g., "CMCG", "HMM", "ZIM", "MAEU")
   * @returns Carrier code string
   */
  getCarrierCode(): string;

  /**
   * Get the carrier name (e.g., "CMA CGM", "HMM", "ZIM", "Maersk")
   * @returns Carrier name string
   */
  getCarrierName(): string;

  /**
   * Check if the adapter is available/configured
   * @returns true if adapter is ready to use
   */
  isAvailable(): boolean;
}

