/**
 * API Client - Centralized API request handler
 *
 * Uses the authenticated axios instance from authService for all API calls.
 * Provides typed request methods with consistent error handling.
 */

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { APIError } from '../types';

// API Configuration
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';

// Secure storage keys
const ACCESS_TOKEN_KEY = 'investiq_access_token';
const REFRESH_TOKEN_KEY = 'investiq_refresh_token';

/**
 * API request error with typed response
 */
export class APIRequestError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIRequestError';
  }
}

/**
 * Create an axios instance with auth interceptors.
 * This is the main API client used by all services.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          // Try to refresh the token
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;

          // Store new tokens
          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access_token);
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);

          // Retry original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Parse error response from API
 */
function parseErrorResponse(error: unknown): APIError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'object' && data !== null) {
      return {
        detail: data.detail || data.message || 'Request failed',
        error: data.error,
        code: data.code,
        message: data.message,
      };
    }
    return { detail: error.message || 'Request failed' };
  }
  return { detail: 'An unexpected error occurred' };
}

/**
 * Make a typed GET request
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await apiClient.get<T>(endpoint, { ...config, params });
    return response.data;
  } catch (error) {
    const apiError = parseErrorResponse(error);
    throw new APIRequestError(
      apiError.detail,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      apiError.code,
      error
    );
  }
}

/**
 * Make a typed POST request
 */
export async function post<T>(
  endpoint: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await apiClient.post<T>(endpoint, data, config);
    return response.data;
  } catch (error) {
    const apiError = parseErrorResponse(error);
    throw new APIRequestError(
      apiError.detail,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      apiError.code,
      error
    );
  }
}

/**
 * Make a typed PUT request
 */
export async function put<T>(
  endpoint: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await apiClient.put<T>(endpoint, data, config);
    return response.data;
  } catch (error) {
    const apiError = parseErrorResponse(error);
    throw new APIRequestError(
      apiError.detail,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      apiError.code,
      error
    );
  }
}

/**
 * Make a typed PATCH request
 */
export async function patch<T>(
  endpoint: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await apiClient.patch<T>(endpoint, data, config);
    return response.data;
  } catch (error) {
    const apiError = parseErrorResponse(error);
    throw new APIRequestError(
      apiError.detail,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      apiError.code,
      error
    );
  }
}

/**
 * Make a typed DELETE request
 */
export async function del<T = void>(
  endpoint: string,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await apiClient.delete<T>(endpoint, config);
    return response.data;
  } catch (error) {
    const apiError = parseErrorResponse(error);
    throw new APIRequestError(
      apiError.detail,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      apiError.code,
      error
    );
  }
}

/**
 * Make a typed DELETE request with body
 */
export async function delWithBody<T = void>(
  endpoint: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await apiClient.delete<T>(endpoint, { ...config, data });
    return response.data;
  } catch (error) {
    const apiError = parseErrorResponse(error);
    throw new APIRequestError(
      apiError.detail,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      apiError.code,
      error
    );
  }
}

/**
 * Download a file (returns blob URL)
 */
export async function downloadFile(endpoint: string): Promise<{ url: string; filename: string }> {
  try {
    const response = await apiClient.get(endpoint, {
      responseType: 'blob',
    });

    // Get filename from Content-Disposition header if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'download';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+?)"?(?:;|$)/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob URL
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);

    return { url, filename };
  } catch (error) {
    const apiError = parseErrorResponse(error);
    throw new APIRequestError(
      apiError.detail,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      apiError.code,
      error
    );
  }
}

/**
 * Upload a file using multipart/form-data
 */
export async function uploadFile<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<T> {
  try {
    const response = await apiClient.post<T>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress
        ? (progressEvent) => {
            const total = progressEvent.total || 0;
            const current = progressEvent.loaded;
            const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
            onProgress(percentage);
          }
        : undefined,
    });
    return response.data;
  } catch (error) {
    const apiError = parseErrorResponse(error);
    throw new APIRequestError(
      apiError.detail,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      apiError.code,
      error
    );
  }
}

/**
 * Generic API request function for custom configurations
 */
export async function request<T>(
  endpoint: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: unknown;
    params?: Record<string, unknown>;
    config?: AxiosRequestConfig;
  }
): Promise<T> {
  const { method = 'GET', data, params, config } = options || {};

  try {
    const response = await apiClient.request<T>({
      url: endpoint,
      method,
      data,
      params,
      ...config,
    });
    return response.data;
  } catch (error) {
    const apiError = parseErrorResponse(error);
    throw new APIRequestError(
      apiError.detail,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      apiError.code,
      error
    );
  }
}

// Export as a unified api object for convenience
export const api = {
  get,
  post,
  put,
  patch,
  del,
  delWithBody,
  downloadFile,
  uploadFile,
  request,
  client: apiClient,
};

export default api;
