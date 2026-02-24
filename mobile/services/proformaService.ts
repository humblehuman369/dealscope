/**
 * Proforma Service — download and share proforma reports.
 *
 * Matches frontend api.proforma endpoints. Uses expo-file-system
 * for download and expo-sharing for the native share sheet.
 */

import { cacheDirectory, downloadAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from './apiClient';
import { getAccessToken } from './authService';

interface ProformaParams {
  propertyId: string;
  address: string;
  strategy: string;
  holdPeriodYears?: number;
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildUrl(
  propertyId: string,
  format: 'excel' | 'pdf' | 'data',
  params: { address: string; strategy: string; holdPeriodYears?: number },
): string {
  const qs = new URLSearchParams({
    address: params.address,
    strategy: params.strategy,
    hold_period_years: String(params.holdPeriodYears ?? 10),
  });
  const suffix = format === 'data' ? '' : `/${format}`;
  return `${API_BASE_URL}/api/v1/proforma/property/${propertyId}${suffix}?${qs}`;
}

export const proformaService = {
  /**
   * Download an Excel proforma and open the share sheet.
   */
  async downloadExcel(params: ProformaParams): Promise<string> {
    const url = buildUrl(params.propertyId, 'excel', params);
    const filename = `${params.address.replace(/[^a-zA-Z0-9]/g, '_')}_proforma.xlsx`;
    const fileUri = `${cacheDirectory}${filename}`;

    const result = await downloadAsync(url, fileUri, {
      headers: authHeaders(),
    });
    if (result.status !== 200) throw new Error(`Download failed (${result.status})`);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Share Excel Report',
      });
    }
    return result.uri;
  },

  /**
   * Download a PDF proforma and open the share sheet.
   */
  async downloadPdf(params: ProformaParams): Promise<string> {
    const url = buildUrl(params.propertyId, 'pdf', params);
    const filename = `${params.address.replace(/[^a-zA-Z0-9]/g, '_')}_proforma.pdf`;
    const fileUri = `${cacheDirectory}${filename}`;

    const result = await downloadAsync(url, fileUri, {
      headers: authHeaders(),
    });
    if (result.status !== 200) throw new Error(`Download failed (${result.status})`);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share PDF Report',
      });
    }
    return result.uri;
  },

  /**
   * Get proforma data (JSON) for in-app rendering.
   */
  async getData(
    params: ProformaParams,
  ): Promise<Record<string, unknown>> {
    const url = buildUrl(params.propertyId, 'data', params);
    const response = await fetch(url, { headers: authHeaders() });
    if (!response.ok) throw new Error(`Proforma fetch failed (${response.status})`);
    return response.json();
  },
};
