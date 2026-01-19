/**
 * Schedule Routes
 * Defines schedule API endpoints
 */

import { Router } from 'express';
import { ScheduleController } from '@api/controllers/ScheduleController';
import { carrierFilter } from '@api/middleware/carrierFilter';
import { validateScheduleQuery } from '@api/middleware/validation';

const router = Router();
const scheduleController = new ScheduleController();

/**
 * GET /api/v1/schedules
 * Get vessel schedules from one or all carriers
 *
 * Query parameters:
 * - carrier: "cma-cgm" | "hmm" | "zim" | "maersk" | "all" (default: "all")
 * - vesselIMONumber: IMO number
 * - vesselName: Vessel name
 * - carrierServiceCode: Service code
 * - carrierVoyageNumber: Voyage number
 * - UNLocationCode: UN Location code
 * - facilitySMDGCode: Facility SMDG code
 * - startDate: Start date (ISO 8601)
 * - endDate: End date (ISO 8601)
 * - limit: Maximum number of results
 * - cursor: Pagination cursor
 */
router.get(
  '/',
  carrierFilter,
  validateScheduleQuery,
  scheduleController.getSchedules.bind(scheduleController)
);

export default router;

