/**
 * CMA CGM Tracking Adapter
 * Implements TrackingAdapter for CMA CGM's DCSA-compliant Track & Trace API
 */

import { TrackingAdapter } from '@adapters/carriers/base/TrackingAdapter';
import { TrackingEvent, TrackingQueryParams } from '@domain/models/tracking';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { Logger } from '@infrastructure/logger/Logger';

/**
 * CMA CGM Tracking Adapter
 * DCSA standard API - direct mapping with minimal transformation
 */
export class CMACGMTrackingAdapter implements TrackingAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'CMCG';

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
    const baseEndpoint = this.config.apis.tracking?.endpoint;
    if (!baseEndpoint) {
      throw new Error('Tracking API endpoint not configured for CMA CGM');
    }

    // CMA CGM has two endpoints:
    // 1. GET /events/{trackingReference} - for direct tracking reference lookup (B/L number, container number, etc.)
    // 2. GET /events - for filtered search with query parameters
    
    // If transportDocumentReference or equipmentReference is provided, use path parameter endpoint
    // Priority: transportDocumentReference > equipmentReference > carrierBookingReference
    const trackingReference = params.transportDocumentReference || params.equipmentReference || params.carrierBookingReference;
    
    let endpoint: string;
    let queryParams: Record<string, string | string[]> = {};

    if (trackingReference) {
      // Use path parameter endpoint: /events/{trackingReference}
      endpoint = `${baseEndpoint}/${encodeURIComponent(trackingReference)}`;
      
      Logger.info(`CMA CGM: Using path parameter endpoint`, {
        carrier: this.carrierCode,
        trackingReference,
        endpoint,
        baseURL: this.config.baseUrl,
        fullURL: `${this.config.baseUrl}${endpoint}`,
      });
      
      // Additional query parameters for path endpoint
      if (params.behalfOf) {
        queryParams.behalfOf = params.behalfOf;
      }
      if (params.limit) {
        queryParams.limit = params.limit.toString();
      }
      if (params.cursor) {
        queryParams.cursor = params.cursor;
      }
    } else {
      // Use query parameter endpoint: /events
      endpoint = baseEndpoint;
      
      // Build query parameters
      if (params.eventType && params.eventType.length > 0) {
        queryParams.eventType = params.eventType;
      }
      if (params.shipmentEventTypeCode && params.shipmentEventTypeCode.length > 0) {
        queryParams.shipmentEventTypeCode = params.shipmentEventTypeCode;
      }
      if (params.transportEventTypeCode && params.transportEventTypeCode.length > 0) {
        queryParams.transportEventTypeCode = params.transportEventTypeCode;
      }
      if (params.equipmentEventTypeCode && params.equipmentEventTypeCode.length > 0) {
        queryParams.equipmentEventTypeCode = params.equipmentEventTypeCode;
      }
      if (params.documentTypeCode && params.documentTypeCode.length > 0) {
        queryParams.documentTypeCode = params.documentTypeCode;
      }
      if (params.carrierBookingReference) {
        queryParams.carrierBookingReference = params.carrierBookingReference;
      }
      if (params.transportDocumentReference) {
        queryParams.transportDocumentReference = params.transportDocumentReference;
      }
      if (params.equipmentReference) {
        queryParams.equipmentReference = params.equipmentReference;
      }
      if (params.transportCallID) {
        queryParams.transportCallID = params.transportCallID;
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
      if (params.eventDateTime) {
        queryParams.eventDateTime = params.eventDateTime;
      }
      if (params.behalfOf) {
        queryParams.behalfOf = params.behalfOf;
      }
      if (params.limit) {
        queryParams.limit = params.limit.toString();
      }
      if (params.cursor) {
        queryParams.cursor = params.cursor;
      }
    }

    try {
      // DCSA standard API - response is already in the correct format
      Logger.info(`CMA CGM: Making API request`, {
        carrier: this.carrierCode,
        endpoint,
        baseURL: this.config.baseUrl,
        fullURL: `${this.config.baseUrl}${endpoint}`,
        queryParams,
      });
      
      const response = await this.httpClient.get<any>(endpoint, {
        params: queryParams,
      });

      Logger.info(`CMA CGM: Received API response`, {
        carrier: this.carrierCode,
        responseType: typeof response,
        isArray: Array.isArray(response),
        responseLength: Array.isArray(response) ? response.length : 'N/A',
        responsePreview: Array.isArray(response) && response.length > 0 
          ? JSON.stringify(response[0]).substring(0, 500) 
          : JSON.stringify(response).substring(0, 500),
        fullResponse: Array.isArray(response) ? `Array with ${response.length} items` : JSON.stringify(response),
      });

      // Check if response is HTML (indicates authentication failure or wrong endpoint)
      if (typeof response === 'string' && (
        response.trim().startsWith('<!doctype') || 
        response.trim().startsWith('<!DOCTYPE') || 
        response.includes('<html')
      )) {
        Logger.error(`CMA CGM: Received HTML response instead of JSON - likely authentication failure`, {
          carrier: this.carrierCode,
          responsePreview: response.substring(0, 200),
        });
        throw new Error(
          'CMA CGM Tracking API returned HTML instead of JSON. This usually indicates:\n' +
          '1. API Key is missing or invalid - check CMCG_API_KEY in .env file\n' +
          '2. API Key header name is incorrect - should be "keyId" (lowercase)\n' +
          '3. Wrong base URL - verify the API endpoint in CMA CGM API Portal'
        );
      }

      // Ensure response is an array
      if (Array.isArray(response)) {
        Logger.info(`CMA CGM: Returning ${response.length} events`, {
          carrier: this.carrierCode,
        });
        return response;
      }
      // If response is not an array, return empty array or wrap it
      if (response && typeof response === 'object') {
        // Check if response has a data property that is an array
        if ('data' in response && Array.isArray((response as any).data)) {
          return (response as any).data;
        }
        // If response is a single event object, wrap it in an array
        return [response as TrackingEvent];
      }
      return [];
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `CMA CGM Tracking API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }
}

