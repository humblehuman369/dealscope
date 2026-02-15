/**
 * API Client - Centralized API request handler
 *
 * Token management is delegated to authService.ts (single source of truth).
 * The access token lives in memory; the refresh token is in SecureStore
 * under keys managed by authService.
 *
 * Provides typed request methods with consistent error handling.
 */

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { cacheDirectory, downloadAsync, type FileSystemDownloadResult } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { APIError } from '../types';
import {
  getAccessToken,
  refreshWithMutex,
} from './authService';

// API Configuration
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';

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

// Add auth token to requests — reads the in-memory access token from authService
apiClient.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401 errors.
// Delegates to authService.refreshWithMutex() so that only a single
// refresh request is in-flight at any time — preventing token rotation
// races when multiple requests 401 simultaneously.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshed = await refreshWithMutex();
      if (refreshed) {
        // refreshWithMutex stored new tokens; re-read the fresh access token
        const newToken = getAccessToken();
        if (originalRequest.headers && newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
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
      // FastAPI 422 returns detail as an array of validation errors
      let detail: string;
      if (typeof data.detail === 'string') {
        detail = data.detail;
      } else if (Array.isArray(data.detail)) {
        detail = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
      } else if (data.detail && typeof data.detail === 'object') {
        detail = JSON.stringify(data.detail);
      } else if (typeof data.message === 'string') {
        detail = data.message;
      } else {
        detail = `Request failed (${error.response?.status || 'unknown'})`;
      }
      return {
        detail,
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
 * Download a file to the device's cache directory.
 *
 * Uses expo-file-system instead of browser Blob/URL.createObjectURL
 * (which are not available in React Native).
 *
 * Returns the local file URI and parsed filename.
 */
export async function downloadFile(
  endpoint: string,
  suggestedFilename?: string,
): Promise<{ uri: string; filename: string }> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build a safe local filename
  const filename =
    suggestedFilename || endpoint.split('/').pop()?.split('?')[0] || 'download';
  const localUri = `${cacheDirectory ?? ''}${filename}`;

  try {
    const result = await downloadAsync(
      `${API_BASE_URL}${endpoint}`,
      localUri,
      { headers },
    );

    if (result.status < 200 || result.status >= 300) {
      throw new APIRequestError(
        `Download failed (${result.status})`,
        result.status,
      );
    }

    // Try to extract a better filename from Content-Disposition
    const contentDisposition = result.headers['Content-Disposition'] || result.headers['content-disposition'];
    let resolvedFilename = filename;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?(?:;|$)/);
      if (match) {
        resolvedFilename = match[1];
      }
    }

    return { uri: result.uri, filename: resolvedFilename };
  } catch (error) {
    if (error instanceof APIRequestError) throw error;
    const apiError = parseErrorResponse(error);
    throw new APIRequestError(
      apiError.detail,
      undefined,
      apiError.code,
      error,
    );
  }
}

/**
 * Share a downloaded file using the native share sheet.
 * Convenience wrapper around downloadFile + expo-sharing.
 */
export async function downloadAndShareFile(
  endpoint: string,
  suggestedFilename?: string,
): Promise<void> {
  const { uri } = await downloadFile(endpoint, suggestedFilename);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri);
  } else {
    throw new APIRequestError('Sharing is not available on this device');
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
  downloadAndShareFile,
  uploadFile,
  request,
  client: apiClient,
};

export default api;
