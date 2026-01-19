/**
 * Authentication Manager
 * Manages OAuth2 and API Key authentication for carrier APIs
 */

import axios, { AxiosInstance } from 'axios';
import { CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { Logger } from '@infrastructure/logger/Logger';

interface OAuth2Token {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
  tokenType: string;
}

/**
 * Authentication Manager for carrier APIs
 */
export class AuthManager {
  private static tokenCache: Map<string, TokenCache> = new Map();
  private static httpClient: AxiosInstance = axios.create();

  /**
   * Get authentication headers for a carrier
   * @param carrierCode Carrier code
   * @param config Carrier configuration
   * @param endpointType Optional endpoint type (schedule, tracking, portSchedule) for endpoint-specific API keys
   * @returns Authentication headers
   */
  static async getAuthHeaders(
    carrierCode: string,
    config: CarrierConfig,
    endpointType?: string
  ): Promise<Record<string, string>> {
    if (config.auth.type === 'oauth2') {
      const token = await this.getOAuth2Token(carrierCode, config);
      const headers: Record<string, string> = {
        Authorization: `${token.tokenType} ${token.token}`,
      };
      
      // Some carriers (like Maersk) require both OAuth2 token and API Key header
      if (config.auth.headerName && config.auth.apiKeys) {
        const apiKeyEnvVar = endpointType && config.auth.apiKeys[endpointType]
          ? config.auth.apiKeys[endpointType]!
          : config.auth.apiKeys.schedule || config.auth.apiKeys.tracking;
        
        if (apiKeyEnvVar) {
          const apiKey = this.getEnvVar(apiKeyEnvVar);
          if (apiKey) {
            headers[config.auth.headerName] = apiKey;
          }
        }
      }
      
      return headers;
    } else if (config.auth.type === 'apikey') {
      const apiKey = this.getApiKey(carrierCode, config, endpointType);
      // Use endpoint-specific header name if available, otherwise use default
      const headerName = endpointType && config.auth.headerNames?.[endpointType]
        ? config.auth.headerNames[endpointType]!
        : config.auth.headerName || 'KeyId';
      return {
        [headerName]: apiKey,
      };
    }

    return {};
  }

  /**
   * Get OAuth2 access token (with caching and auto-refresh)
   * @param carrierCode Carrier code
   * @param config Carrier configuration
   * @returns Token information
   */
  private static async getOAuth2Token(
    carrierCode: string,
    config: CarrierConfig
  ): Promise<TokenCache> {
    const cacheKey = `${carrierCode}_oauth2`;
    const cached = this.tokenCache.get(cacheKey);

    // Check if cached token is still valid (with 5 minute buffer)
    if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      return cached;
    }

    // Get credentials from environment variables
    // For Maersk: Consumer Key = CLIENT_ID, Secret Key = CLIENT_SECRET
    // Try both naming conventions
    const clientId = this.getEnvVar(`${carrierCode}_CLIENT_ID`) 
      || this.getEnvVar(`${carrierCode}_CONSUMER_KEY`);
    const clientSecret = this.getEnvVar(`${carrierCode}_CLIENT_SECRET`)
      || this.getEnvVar(`${carrierCode}_SECRET_KEY`);

    if (!clientId || !clientSecret) {
      const errorMsg = carrierCode === 'MAERSK'
        ? `OAuth2 credentials not found for carrier: ${carrierCode}. ` +
          `Please set ${carrierCode}_CONSUMER_KEY and ${carrierCode}_SECRET_KEY (or ${carrierCode}_CLIENT_ID and ${carrierCode}_CLIENT_SECRET) environment variables.`
        : `OAuth2 credentials not found for carrier: ${carrierCode}. ` +
          `Please set ${carrierCode}_CLIENT_ID and ${carrierCode}_CLIENT_SECRET environment variables.`;
      throw new Error(errorMsg);
    }

    if (!config.auth.tokenUrl) {
      throw new Error(`OAuth2 token URL not configured for carrier: ${carrierCode}`);
    }

    // Request new token
    try {
      const scope = config.auth.scopes?.join(' ') || '';
      const response = await this.httpClient.post<OAuth2Token>(
        config.auth.tokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: scope,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenData = response.data;
      const expiresAt = Date.now() + (tokenData.expires_in * 1000);

      const tokenCache: TokenCache = {
        token: tokenData.access_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt: expiresAt,
      };

      this.tokenCache.set(cacheKey, tokenCache);
      return tokenCache;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to obtain OAuth2 token for ${carrierCode}: ` +
          `${error.response?.status} ${error.response?.statusText} - ` +
          `${JSON.stringify(error.response?.data)}`
        );
      }
      throw error;
    }
  }

  /**
   * Get API Key from environment variables
   * @param carrierCode Carrier code
   * @param config Carrier configuration
   * @param endpointType Optional endpoint type for endpoint-specific API keys
   * @returns API key
   */
  private static getApiKey(
    carrierCode: string,
    config: CarrierConfig,
    endpointType?: string
  ): string {
    // For ZIM: Try Primary Key first, then Secondary Key, then regular API Key
    if (endpointType && config.auth.primaryKeys && config.auth.primaryKeys[endpointType]) {
      const primaryKeyEnvVar = config.auth.primaryKeys[endpointType]!;
      const primaryKey = this.getEnvVar(primaryKeyEnvVar);
      if (primaryKey) {
        return primaryKey;
      }
    }

    if (endpointType && config.auth.secondaryKeys && config.auth.secondaryKeys[endpointType]) {
      const secondaryKeyEnvVar = config.auth.secondaryKeys[endpointType]!;
      const secondaryKey = this.getEnvVar(secondaryKeyEnvVar);
      if (secondaryKey) {
        return secondaryKey;
      }
    }

    // If endpoint-specific API keys are configured, use them
    if (endpointType && config.auth.apiKeys && config.auth.apiKeys[endpointType]) {
      const envVarName = config.auth.apiKeys[endpointType]!;
      const apiKey = this.getEnvVar(envVarName);
      if (apiKey) {
        return apiKey;
      }
      // Fall back to default if endpoint-specific key is not found
    }

    // Fall back to default API key
    const defaultApiKey = this.getEnvVar(`${carrierCode}_API_KEY`);
    if (defaultApiKey) {
      Logger.debug(`Using default API key for ${carrierCode}`, {
        carrier: carrierCode,
        endpointType,
        envVar: `${carrierCode}_API_KEY`,
      });
      return defaultApiKey;
    }

    // If endpoint-specific was requested but not found, provide helpful error
    if (endpointType) {
      const errorMessages: string[] = [];
      if (config.auth.primaryKeys?.[endpointType]) {
        errorMessages.push(`${config.auth.primaryKeys[endpointType]} (Primary Key)`);
      }
      if (config.auth.secondaryKeys?.[endpointType]) {
        errorMessages.push(`${config.auth.secondaryKeys[endpointType]} (Secondary Key)`);
      }
      if (config.auth.apiKeys?.[endpointType]) {
        errorMessages.push(`${config.auth.apiKeys[endpointType]}`);
      }
      
      if (errorMessages.length > 0) {
        throw new Error(
          `API Key not found for carrier: ${carrierCode}, endpoint: ${endpointType}. ` +
          `Please set one of: ${errorMessages.join(', ')}`
        );
      }
    }

    throw new Error(
      `API Key not found for carrier: ${carrierCode}. ` +
      `Please set ${carrierCode}_API_KEY environment variable.`
    );
  }

  /**
   * Get environment variable value
   * @param key Environment variable key
   * @returns Environment variable value or undefined
   */
  private static getEnvVar(key: string): string | undefined {
    return process.env[key];
  }

  /**
   * Clear token cache for a carrier (useful for testing or forced refresh)
   * @param carrierCode Carrier code
   */
  static clearTokenCache(carrierCode: string): void {
    this.tokenCache.delete(`${carrierCode}_oauth2`);
  }

  /**
   * Clear all token caches
   */
  static clearAllTokenCaches(): void {
    this.tokenCache.clear();
  }
}

