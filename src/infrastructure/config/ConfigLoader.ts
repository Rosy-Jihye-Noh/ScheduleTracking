/**
 * Configuration Loader
 * Loads carrier configuration files from config/carriers/
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CarrierConfig {
  name: string;
  code: string;
  baseUrl: string;
  apis: {
    schedule?: {
      endpoint: string;
      version: string;
      standard: 'DCSA' | 'PROPRIETARY';
      method?: 'GET' | 'POST';
      supportsPagination?: boolean;
    };
    portSchedule?: {
      endpoint: string;
      version: string;
      standard: 'DCSA' | 'PROPRIETARY';
      method?: 'GET' | 'POST';
      supportsPagination?: boolean;
    };
    ptpSchedule?: {
      endpoint: string;
      version: string;
      standard: 'DCSA' | 'PROPRIETARY';
      method?: 'GET' | 'POST';
      supportsPagination?: boolean;
    };
    proforma?: {
      endpoint: string;
      version: string;
      standard: 'DCSA' | 'PROPRIETARY';
      method?: 'GET' | 'POST';
      supportsPagination?: boolean;
    };
    voyage?: {
      endpoint: string;
      version: string;
      standard: 'DCSA' | 'PROPRIETARY';
      method?: 'GET' | 'POST';
      supportsPagination?: boolean;
    };
    route?: {
      endpoint: string;
      version: string;
      standard: 'DCSA' | 'PROPRIETARY';
      method?: 'GET' | 'POST';
      supportsPagination?: boolean;
    };
    pointToPoint?: {
      endpoint: string;
      version: string;
      standard: 'DCSA' | 'PROPRIETARY';
      method?: 'GET' | 'POST';
      supportsPagination?: boolean;
    };
    tracking?: {
      endpoint: string;
      version: string;
      standard: 'DCSA' | 'PROPRIETARY';
      method?: 'GET' | 'POST';
      supportsPagination?: boolean;
    };
  };
  auth: {
    type: 'oauth2' | 'apikey';
    tokenUrl?: string;
    scopes?: string[];
    headerName?: string;
    headerNames?: {
      schedule?: string;
      tracking?: string;
      portSchedule?: string;
      ptpSchedule?: string;
      proforma?: string;
      voyage?: string;
      route?: string;
      [key: string]: string | undefined;
    };
    apiKeys?: {
      schedule?: string;
      tracking?: string;
      portSchedule?: string;
      ptpSchedule?: string;
      pointToPoint?: string;
      proforma?: string;
      voyage?: string;
      route?: string;
      [key: string]: string | undefined;
    };
    primaryKeys?: {
      schedule?: string;
      tracking?: string;
      portSchedule?: string;
      ptpSchedule?: string;
      proforma?: string;
      voyage?: string;
      route?: string;
      [key: string]: string | undefined;
    };
    secondaryKeys?: {
      schedule?: string;
      tracking?: string;
      portSchedule?: string;
      ptpSchedule?: string;
      proforma?: string;
      voyage?: string;
      route?: string;
      [key: string]: string | undefined;
    };
  };
  features?: {
    supportsPagination?: boolean;
    maxLimit?: number;
    defaultLimit?: number;
    requestTimeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  };
  enabled?: boolean;
}

export class ConfigLoader {
  private static configs: Map<string, CarrierConfig> = new Map();

  /**
   * Load carrier configuration from file
   * @param carrierCode Carrier code (e.g., "CMCG", "HMM")
   * @returns Carrier configuration
   */
  static loadCarrierConfig(carrierCode: string): CarrierConfig {
    if (this.configs.has(carrierCode)) {
      return this.configs.get(carrierCode)!;
    }

    const configPath = path.join(
      process.cwd(),
      'config',
      'carriers',
      `${carrierCode.toLowerCase()}.json`
    );

    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found for carrier: ${carrierCode}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: CarrierConfig = JSON.parse(configContent);

    // Validate required fields
    if (!config.name || !config.code || !config.baseUrl) {
      throw new Error(`Invalid configuration for carrier: ${carrierCode}`);
    }

    this.configs.set(carrierCode, config);
    return config;
  }

  /**
   * Load all carrier configurations
   * @returns Map of carrier code to configuration
   */
  static loadAllCarrierConfigs(): Map<string, CarrierConfig> {
    const configsDir = path.join(process.cwd(), 'config', 'carriers');
    
    if (!fs.existsSync(configsDir)) {
      return new Map();
    }

    const files = fs.readdirSync(configsDir);
    const configs = new Map<string, CarrierConfig>();

    for (const file of files) {
      if (file.endsWith('.json') && file !== 'template.json') {
        try {
          const configPath = path.join(configsDir, file);
          const configContent = fs.readFileSync(configPath, 'utf-8');
          const config: CarrierConfig = JSON.parse(configContent);
          
          if (config.enabled !== false && config.code) {
            configs.set(config.code.toUpperCase(), config);
            this.configs.set(config.code.toUpperCase(), config);
          }
        } catch (error) {
          console.error(`Failed to load config for ${file}:`, error);
        }
      }
    }

    return configs;
  }

  /**
   * Clear cached configurations (useful for testing)
   */
  static clearCache(): void {
    this.configs.clear();
  }
}

