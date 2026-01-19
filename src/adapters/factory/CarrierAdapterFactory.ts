/**
 * Carrier Adapter Factory
 * Dynamically creates and manages carrier adapters
 */

import { CarrierAdapter } from '@adapters/carriers/base/CarrierAdapter';
import { ConfigLoader } from '@infrastructure/config/ConfigLoader';

// Import all carrier adapters
import { CMACGMAdapter } from '@adapters/carriers/cma-cgm/CMACGMAdapter';
import { HMMAdapter } from '@adapters/carriers/hmm/HMMAdapter';
import { ZIMAdapter } from '@adapters/carriers/zim/ZIMAdapter';
import { MaerskAdapter } from '@adapters/carriers/maersk/MaerskAdapter';

/**
 * Carrier Adapter Factory
 * Singleton pattern for adapter management
 */
export class CarrierAdapterFactory {
  private static instance: CarrierAdapterFactory;
  private adapters: Map<string, CarrierAdapter> = new Map();
  private adapterClasses: Map<string, new () => CarrierAdapter> = new Map();

  private constructor() {
    // Register adapter classes
    this.adapterClasses.set('CMCG', CMACGMAdapter);
    this.adapterClasses.set('HMM', HMMAdapter);
    this.adapterClasses.set('ZIM', ZIMAdapter);
    this.adapterClasses.set('MAERSK', MaerskAdapter);

    // Load all carrier configs and initialize adapters
    this.initializeAdapters();
  }

  /**
   * Get singleton instance
   * @returns Factory instance
   */
  static getInstance(): CarrierAdapterFactory {
    if (!CarrierAdapterFactory.instance) {
      CarrierAdapterFactory.instance = new CarrierAdapterFactory();
    }
    return CarrierAdapterFactory.instance;
  }

  /**
   * Initialize adapters from config files
   */
  private initializeAdapters(): void {
    try {
      const configs = ConfigLoader.loadAllCarrierConfigs();

      for (const [carrierCode, config] of configs.entries()) {
        if (config.enabled === false) {
          continue;
        }

        const AdapterClass = this.adapterClasses.get(carrierCode);
        if (AdapterClass) {
          try {
            const adapter = new AdapterClass();
            if (adapter.isAvailable()) {
              this.adapters.set(carrierCode, adapter);
            }
          } catch (error) {
            console.error(`Failed to initialize adapter for ${carrierCode}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize adapters:', error);
    }
  }

  /**
   * Get adapter by carrier code
   * @param carrierCode Carrier code (e.g., "CMCG", "HMM", "ZIM", "MAERSK")
   * @returns Carrier adapter instance
   * @throws Error if adapter not found or not available
   */
  getAdapter(carrierCode: string): CarrierAdapter {
    const normalizedCode = carrierCode.toUpperCase();
    const adapter = this.adapters.get(normalizedCode);

    if (!adapter) {
      throw new Error(`Adapter not found or not available for carrier: ${carrierCode}`);
    }

    return adapter;
  }

  /**
   * Get all available adapters
   * @returns Map of carrier code to adapter
   */
  getAllAdapters(): Map<string, CarrierAdapter> {
    return new Map(this.adapters);
  }

  /**
   * Get list of available carrier codes
   * @returns Array of carrier codes
   */
  getAvailableCarrierCodes(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if carrier is available
   * @param carrierCode Carrier code
   * @returns true if adapter is available
   */
  isCarrierAvailable(carrierCode: string): boolean {
    const normalizedCode = carrierCode.toUpperCase();
    return this.adapters.has(normalizedCode);
  }

  /**
   * Get adapter by carrier name (case-insensitive)
   * Supports both carrier code and common names
   * @param carrierIdentifier Carrier code or name
   * @returns Carrier adapter instance
   */
  getAdapterByIdentifier(carrierIdentifier: string): CarrierAdapter {
    const normalized = carrierIdentifier.toUpperCase();

    // Direct code match
    if (this.adapters.has(normalized)) {
      return this.adapters.get(normalized)!;
    }

    // Name mapping
    const nameMap: Record<string, string> = {
      'CMA CGM': 'CMCG',
      'CMA-CGM': 'CMCG',
      'CMA_CGM': 'CMCG',
      'CMACGM': 'CMCG',
      'HMM': 'HMM',
      'ZIM': 'ZIM',
      'MAERSK': 'MAERSK',
      'MAERSK LINE': 'MAERSK',
    };

    const mappedCode = nameMap[normalized];
    if (mappedCode && this.adapters.has(mappedCode)) {
      return this.adapters.get(mappedCode)!;
    }

    throw new Error(`Adapter not found for identifier: ${carrierIdentifier}`);
  }

  /**
   * Refresh adapters (reload from config)
   */
  refreshAdapters(): void {
    this.adapters.clear();
    this.initializeAdapters();
  }
}

