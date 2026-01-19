/**
 * Tracking Routes
 * Defines tracking API endpoints
 */

import { Router } from 'express';
import { TrackingController } from '@api/controllers/TrackingController';
import { carrierFilter } from '@api/middleware/carrierFilter';
import { validateTrackingQuery } from '@api/middleware/validation';

const router = Router();
const trackingController = new TrackingController();

/**
 * GET /api/v1/tracking
 * Get tracking events from one or all carriers
 *
 * Query parameters:
 * - carrier: "cma-cgm" | "hmm" | "zim" | "maersk" | "all" (default: "all")
 * - carrierBookingReference: Booking reference
 * - transportDocumentReference: Transport document reference
 * - equipmentReference: Equipment/container reference
 * - eventType: Event type (SHIPMENT, TRANSPORT, EQUIPMENT)
 * - vesselIMONumber: IMO number
 * - exportVoyageNumber: Export voyage number
 * - carrierServiceCode: Service code
 * - UNLocationCode: UN Location code
 * - limit: Maximum number of results
 * - cursor: Pagination cursor
 */
router.get(
  '/',
  carrierFilter,
  validateTrackingQuery,
  trackingController.getTracking.bind(trackingController)
);

export default router;

