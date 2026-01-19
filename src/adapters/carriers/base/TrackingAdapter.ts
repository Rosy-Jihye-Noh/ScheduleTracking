/**
 * Tracking Adapter Interface
 * All carrier tracking adapters must implement this interface
 */

import { TrackingEvent, TrackingQueryParams } from '@domain/models/tracking';

/**
 * Interface for Tracking API adapters
 */
export interface TrackingAdapter {
  /**
   * Get tracking events based on query parameters
   * @param params Query parameters for filtering events
   * @returns Array of tracking events
   */
  getTracking(params: TrackingQueryParams): Promise<TrackingEvent[]>;
}

