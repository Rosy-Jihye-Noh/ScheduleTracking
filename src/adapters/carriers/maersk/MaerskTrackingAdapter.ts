/**
 * Maersk Tracking Adapter
 * Implements TrackingAdapter for Maersk's DCSA-compliant Track & Trace API
 */

import { TrackingAdapter } from '@adapters/carriers/base/TrackingAdapter';
import { TrackingEvent, TrackingQueryParams } from '@domain/models/tracking';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';

/**
 * Maersk Tracking Adapter
 * DCSA standard API - direct mapping with minimal transformation
 */
export class MaerskTrackingAdapter implements TrackingAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'MAERSK';

  constructor() {
    this.config = ConfigLoader.loadCarrierConfig(this.carrierCode);
    this.httpClient = new HttpClient(this.carrierCode, this.config);
  }

  /**
   * Get tracking events
   * @param params Query parameters
   * @returns Array of tracking events
   */
  async getTracking(params: TrackingQueryParams): Promise<TrackingEvent[]> {
    const endpoint = this.config.apis.tracking?.endpoint;
    if (!endpoint) {
      throw new Error('Tracking API endpoint not configured for Maersk');
    }

    // Maersk requires at least one of: carrierBookingReference, transportDocumentReference, equipmentReference
    if (
      !params.carrierBookingReference &&
      !params.transportDocumentReference &&
      !params.equipmentReference
    ) {
      throw new Error(
        'Maersk Tracking API requires at least one of: carrierBookingReference, ' +
        'transportDocumentReference, or equipmentReference'
      );
    }

    // Build query parameters
    const queryParams: Record<string, string | string[]> = {};

    if (params.carrierBookingReference) {
      queryParams.carrierBookingReference = params.carrierBookingReference;
    }
    if (params.transportDocumentReference) {
      queryParams.transportDocumentReference = params.transportDocumentReference;
    }
    if (params.equipmentReference) {
      queryParams.equipmentReference = params.equipmentReference;
    }
    if (params.eventType && params.eventType.length > 0) {
      queryParams.eventType = params.eventType.join(',');
    }
    if (params.shipmentEventTypeCode && params.shipmentEventTypeCode.length > 0) {
      queryParams.shipmentEventTypeCode = params.shipmentEventTypeCode.join(',');
    }
    if (params.transportEventTypeCode && params.transportEventTypeCode.length > 0) {
      queryParams.transportEventTypeCode = params.transportEventTypeCode.join(',');
    }
    if (params.equipmentEventTypeCode && params.equipmentEventTypeCode.length > 0) {
      queryParams.equipmentEventTypeCode = params.equipmentEventTypeCode.join(',');
    }
    if (params.documentTypeCode && params.documentTypeCode.length > 0) {
      queryParams.documentTypeCode = params.documentTypeCode.join(',');
    }
    if (params.vesselIMONumber) {
      queryParams.vesselIMONumber = params.vesselIMONumber;
    }
    if (params.exportVoyageNumber) {
      queryParams.exportVoyageNumber = params.exportVoyageNumber;
    }
    if (params.carrierServiceCode) {
      queryParams.carrierServiceCode = params.carrierServiceCode;
    }
    if (params.UNLocationCode) {
      queryParams.UNLocationCode = params.UNLocationCode;
    }
    if (params.eventCreatedDateTime) {
      queryParams.eventCreatedDateTime = params.eventCreatedDateTime;
    }
    if (params.limit) {
      queryParams.limit = params.limit.toString();
    }
    if (params.cursor) {
      queryParams.cursor = params.cursor;
    }

    // Add API-Version header if needed
    const headers: Record<string, string> = {};
    if (this.config.apis.tracking?.version) {
      const majorVersion = this.config.apis.tracking.version.split('.')[0];
      headers['API-Version'] = majorVersion;
    }

    try {
      // DCSA standard API - response is already in the correct format
      // Note: Maersk returns {events: TrackingEvent[]} wrapper, so we need to extract events
      const response = await this.httpClient.get<{ events: TrackingEvent[] }>(endpoint, {
        params: queryParams,
        headers: headers,
      });

      return response.events || [];
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Maersk Tracking API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }
}

