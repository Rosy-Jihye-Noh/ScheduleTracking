/**
 * ZIM Tracking Adapter
 * Implements TrackingAdapter for ZIM's DCSA-compliant Track & Trace API
 */

import { TrackingAdapter } from '@adapters/carriers/base/TrackingAdapter';
import { TrackingEvent, TrackingQueryParams } from '@domain/models/tracking';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';

/**
 * ZIM Tracking Adapter
 * DCSA standard API - direct mapping with minimal transformation
 */
export class ZIMTrackingAdapter implements TrackingAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'ZIM';

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
      throw new Error('Tracking API endpoint not configured for ZIM');
    }

    // ZIM requires at least one of: carrierBookingReference, transportDocumentReference, equipmentReference
    if (
      !params.carrierBookingReference &&
      !params.transportDocumentReference &&
      !params.equipmentReference
    ) {
      throw new Error(
        'ZIM Tracking API requires at least one of: carrierBookingReference, ' +
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
    if (params.transportEventTypeCode && params.transportEventTypeCode.length > 0) {
      queryParams.transportEventTypeCode = params.transportEventTypeCode.join(',');
    }
    if (params.equipmentEventTypeCode && params.equipmentEventTypeCode.length > 0) {
      queryParams.equipmentEventTypeCode = params.equipmentEventTypeCode.join(',');
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

    try {
      // DCSA standard API - response is already in the correct format
      const response = await this.httpClient.get<TrackingEvent[]>(endpoint, {
        params: queryParams,
      });

      return response;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `ZIM Tracking API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }
}

