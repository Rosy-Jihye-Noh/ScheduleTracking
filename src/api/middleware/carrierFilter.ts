/**
 * Carrier Filter Middleware
 * Validates carrier parameter and checks supported carriers
 */

import { Request, Response, NextFunction } from 'express';
import { CarrierAdapterFactory } from '@adapters/factory/CarrierAdapterFactory';

/**
 * Supported carrier identifiers
 */
export const SUPPORTED_CARRIERS = ['cma-cgm', 'hmm', 'zim', 'maersk', 'all'] as const;
export type SupportedCarrier = typeof SUPPORTED_CARRIERS[number];

/**
 * Carrier code mapping
 */
const CARRIER_CODE_MAP: Record<string, string> = {
  'cma-cgm': 'CMCG',
  'hmm': 'HMM',
  'zim': 'ZIM',
  'maersk': 'MAERSK',
};

/**
 * Middleware to validate and normalize carrier parameter
 */
export function carrierFilter(req: Request, res: Response, next: NextFunction): void {
  const carrier = req.query.carrier as string | undefined;

  if (!carrier) {
    // Carrier is optional, default to 'all'
    req.query.carrier = 'all';
    return next();
  }

  const normalizedCarrier = carrier.toLowerCase();

  if (!SUPPORTED_CARRIERS.includes(normalizedCarrier as SupportedCarrier)) {
    res.status(400).json({
      error: 'Invalid carrier parameter',
      message: `Carrier must be one of: ${SUPPORTED_CARRIERS.join(', ')}`,
      received: carrier,
    });
    return;
  }

  // Normalize carrier identifier
  req.query.carrier = normalizedCarrier;

  // If specific carrier, check if it's available
  if (normalizedCarrier !== 'all') {
    const factory = CarrierAdapterFactory.getInstance();
    const carrierCode = CARRIER_CODE_MAP[normalizedCarrier];

    if (!factory.isCarrierAvailable(carrierCode)) {
      res.status(503).json({
        error: 'Carrier not available',
        message: `Carrier '${carrier}' is not available or not configured`,
        carrier: carrier,
      });
      return;
    }
  }

  next();
}

/**
 * Get carrier codes from carrier identifier
 * @param carrierIdentifier Carrier identifier ('all' or specific carrier)
 * @returns Array of carrier codes
 */
export function getCarrierCodes(carrierIdentifier: string): string[] {
  if (carrierIdentifier.toLowerCase() === 'all') {
    const factory = CarrierAdapterFactory.getInstance();
    return factory.getAvailableCarrierCodes();
  }

  const carrierCode = CARRIER_CODE_MAP[carrierIdentifier.toLowerCase()];
  return carrierCode ? [carrierCode] : [];
}

