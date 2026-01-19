/**
 * HTTP Client
 * Wrapper around axios for making API requests with authentication
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AuthManager } from './AuthManager';
import { CarrierConfig } from '@infrastructure/config/ConfigLoader';
import { Logger } from '@infrastructure/logger/Logger';

export class HttpClient {
  private axiosInstance: AxiosInstance;
  private carrierCode: string;
  private config: CarrierConfig;

  constructor(carrierCode: string, config: CarrierConfig) {
    this.carrierCode = carrierCode;
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.features?.requestTimeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(
      async (requestConfig) => {
        // Determine endpoint type from URL
        const endpointType = this.getEndpointType(requestConfig.url || '');
        const authHeaders = await AuthManager.getAuthHeaders(
          this.carrierCode,
          this.config,
          endpointType
        );
        // Merge headers properly for axios
        Object.assign(requestConfig.headers, authHeaders);
        
        // Log request with auth headers (masked)
        const maskedHeaders = authHeaders ? Object.keys(authHeaders).reduce((acc, key) => {
          acc[key] = authHeaders[key] ? `${authHeaders[key].substring(0, 8)}...` : 'missing';
          return acc;
        }, {} as Record<string, string>) : {};
        // Build full URL with query parameters
        const queryString = requestConfig.params 
          ? '?' + new URLSearchParams(requestConfig.params as Record<string, string>).toString()
          : '';
        const fullURL = `${requestConfig.baseURL}${requestConfig.url}${queryString}`;
        
        Logger.info(`HTTP Request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`, {
          carrier: this.carrierCode,
          endpointType,
          baseURL: requestConfig.baseURL,
          fullURL: fullURL,
          queryParams: requestConfig.params,
          authHeaders: maskedHeaders,
          hasAuthHeaders: !!authHeaders && Object.keys(authHeaders).length > 0,
        });
        
        return requestConfig;
      },
      (error) => {
        Logger.error(`HTTP Request Error: ${this.carrierCode}`, {
          carrier: this.carrierCode,
          error: error.message,
        });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Check if response is HTML (indicates authentication failure or wrong endpoint)
        const contentType = response.headers['content-type'] || '';
        const isHtml = contentType.includes('text/html') || 
                      (typeof response.data === 'string' && 
                       (response.data.trim().startsWith('<!doctype') || 
                        response.data.trim().startsWith('<!DOCTYPE') || 
                        response.data.includes('<html')));
        
        if (isHtml) {
          Logger.error(`HTTP Response: Received HTML instead of JSON`, {
            carrier: this.carrierCode,
            status: response.status,
            statusText: response.statusText,
            url: response.config.url,
            contentType,
            responsePreview: typeof response.data === 'string' ? response.data.substring(0, 200) : 'N/A',
          });
          // Don't throw here - let the adapter handle it with better error message
        }
        
        // Log successful response with data preview
        const dataPreview = response.data 
          ? (Array.isArray(response.data) 
              ? `Array[${response.data.length}]` 
              : typeof response.data === 'object' 
                ? JSON.stringify(response.data).substring(0, 500)
                : String(response.data).substring(0, 500))
          : 'No data';
        Logger.info(`HTTP Response: ${response.status} ${response.config.url}`, {
          carrier: this.carrierCode,
          status: response.status,
          statusText: response.statusText,
          dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
          dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
          contentType,
          isHtml,
          dataPreview,
        });
        return response;
      },
      async (error) => {
        if (axios.isAxiosError(error)) {
          // Log error response
          Logger.error(`HTTP Response Error: ${this.carrierCode}`, {
            carrier: this.carrierCode,
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            message: error.message,
          });
          
          // Handle 401 Unauthorized - token might be expired
          if (error.response?.status === 401 && this.config.auth.type === 'oauth2') {
            Logger.warn(`Token expired for ${this.carrierCode}, attempting refresh`, {
              carrier: this.carrierCode,
            });
            // Clear token cache and retry once
            AuthManager.clearTokenCache(this.carrierCode);
            try {
              const endpointType = this.getEndpointType(error.config?.url || '');
              const authHeaders = await AuthManager.getAuthHeaders(
                this.carrierCode,
                this.config,
                endpointType
              );
              const retryConfig = {
                ...error.config!,
                headers: {
                  ...error.config?.headers,
                  ...authHeaders,
                },
              };
              Logger.debug(`Retrying request for ${this.carrierCode}`, {
                carrier: this.carrierCode,
                url: error.config?.url,
              });
              return this.axiosInstance.request(retryConfig);
            } catch (retryError) {
              Logger.error(`Retry failed for ${this.carrierCode}`, {
                carrier: this.carrierCode,
                error: retryError instanceof Error ? retryError.message : String(retryError),
              });
              return Promise.reject(retryError);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a GET request
   * @param url Request URL
   * @param config Axios request config
   * @returns Response data
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
    return response.data;
  }

  /**
   * Make a POST request
   * @param url Request URL
   * @param data Request body
   * @param config Axios request config
   * @returns Response data
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, config);
    return response.data;
  }

  /**
   * Get the underlying axios instance (for advanced usage)
   * @returns Axios instance
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  /**
   * Determine endpoint type from URL
   * @param url Request URL
   * @returns Endpoint type (schedule, tracking, portSchedule, proforma, voyage, route) or undefined
   */
  private getEndpointType(url: string): string | undefined {
    if (!url) return undefined;

    // Check for Point-to-Point endpoints (must be checked before other schedules)
    if (url.includes('point-to-point-routes') || url.includes('point-to-point')) {
      return 'pointToPoint';
    }

    // Check for PTP schedule endpoints (must be checked before other schedules)
    if (url.includes('ptpSchedule') || url.includes('port-to-port-schedule')) {
      return 'ptpSchedule';
    }

    // Check for port schedule endpoints (must be checked before vessel schedule)
    if (url.includes('portSchedule') || url.includes('port-schedules') || url.includes('port-schedule')) {
      return 'portSchedule';
    }

    // Check for vessel schedule endpoints
    if (url.includes('vesselSchedule') || url.includes('vessel-schedule') || url.includes('commercialschedule')) {
      return 'schedule';
    }

    // Check for tracking endpoints
    if (url.includes('cargo-tracking') || url.includes('trackandtrace') || url.includes('track') || url.includes('trace')) {
      return 'tracking';
    }

    // Check for proforma endpoints
    if (url.includes('proforma')) {
      return 'proforma';
    }

    // Check for voyage endpoints
    if (url.includes('voyage')) {
      return 'voyage';
    }

    // Check for route endpoints
    if (url.includes('route') || url.includes('routings')) {
      return 'route';
    }

    return undefined;
  }
}

