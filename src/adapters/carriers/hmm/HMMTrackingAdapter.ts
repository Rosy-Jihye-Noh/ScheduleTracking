/**
 * HMM Tracking Adapter
 * Implements TrackingAdapter for HMM's DCSA-based but proprietary-structured Tracking API
 */

import { TrackingAdapter } from '@adapters/carriers/base/TrackingAdapter';
import { TrackingEvent, TrackingQueryParams } from '@domain/models/tracking';
import { HttpClient } from '@adapters/http/HttpClient';
import { ConfigLoader, CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { mapHMMTrackingToDCSA } from './mappers/trackingMapper';

/**
 * HMM Tracking API Response Structure
 */
interface HMMTrackingResponse {
  shipment?: {
    eventID?: string;
    carrierBookingReference?: string;
    deliveryDateTime?: string;
    carrierID?: string;
  };
  transport?: {
    eventID?: string;
    transportName?: string;
    modeOfTransportCode?: string;
    loadTransportCallId?: string;
    dischargeTransportCallId?: string;
    vesselImoNumber?: string;
  };
  equipment?: {
    ISOEquipmentCode?: string;
  };
  shipmentEvent?: any[];
  transportEvent?: any[];
  equipmentEvent?: any[];
  transportCall?: any[];
}

/**
 * HMM Tracking Adapter
 * DCSA-based but proprietary structure - requires mapper for transformation
 */
export class HMMTrackingAdapter implements TrackingAdapter {
  private httpClient: HttpClient;
  private config: CarrierConfig;
  private carrierCode = 'HMM';

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
      throw new Error('Tracking API endpoint not configured for HMM');
    }

    // HMM API requires both carrierBookingReference and equipmentReference
    if (!params.carrierBookingReference || !params.equipmentReference) {
      throw new Error(
        'HMM Tracking API requires both carrierBookingReference and equipmentReference parameters'
      );
    }

    // Build query parameters
    const queryParams: Record<string, string> = {
      carrierBookingReference: params.carrierBookingReference,
      equipmentReference: params.equipmentReference,
    };

    try {
      // HMM uses GET method
      const response = await this.httpClient.get<HMMTrackingResponse>(endpoint, {
        params: queryParams,
      });

      // Map HMM response to DCSA format
      return mapHMMTrackingToDCSA(response);
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response.data;
        if (errorData?.errors) {
          throw new Error(
            `HMM Tracking API error: ${errorData.statusCode || error.response.status} ` +
            `${errorData.statusCodeText || error.response.statusText} - ` +
            `${errorData.errors.reason || 'Unknown error'}: ${errorData.errors.message || ''}`
          );
        }
        throw new Error(
          `HMM Tracking API error: ${error.response.status} ${error.response.statusText} - ` +
          `${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }
}

