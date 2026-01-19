/**
 * Schedule Adapter Interface
 * All carrier schedule adapters must implement this interface
 */

import { ServiceSchedule, ScheduleQueryParams } from '@domain/models/schedule';

/**
 * Interface for Schedule API adapters
 */
export interface ScheduleAdapter {
  /**
   * Get vessel schedules based on query parameters
   * @param params Query parameters for filtering schedules
   * @returns Array of service schedules
   */
  getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]>;
}

