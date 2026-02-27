/**
 * Document download + share service.
 *
 * Uses expo-file-system (new File/Directory API in SDK 54)
 * to download proforma/LOI files, then expo-sharing
 * to open the native share sheet.
 */

import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { getAccessToken } from './token-manager';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  '';

/**
 * Download a file from the API via fetch, write to cache, and share.
 */
async function fetchAndShare(
  endpoint: string,
  filename: string,
  mimeType: string,
): Promise<void> {
  const token = getAccessToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }

  const blob = await res.blob();
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const file = new File(Paths.cache, filename);
  file.create();
  await file.write(base64);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device');

  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: `Share ${filename}`,
  });
}

// ---------------------------------------------------------------------------
// Proforma
// ---------------------------------------------------------------------------

export async function downloadProformaExcel(
  propertyId: string,
  address: string,
): Promise<void> {
  const params = new URLSearchParams({ address });
  await fetchAndShare(
    `/api/v1/proforma/property/${propertyId}/excel?${params}`,
    `DealGapIQ_Proforma_${Date.now()}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}

export async function downloadProformaPdf(
  propertyId: string,
  address: string,
): Promise<void> {
  const params = new URLSearchParams({ address });
  await fetchAndShare(
    `/api/v1/proforma/property/${propertyId}/pdf?${params}`,
    `DealGapIQ_Proforma_${Date.now()}.pdf`,
    'application/pdf',
  );
}

// ---------------------------------------------------------------------------
// LOI
// ---------------------------------------------------------------------------

export async function downloadLoiDocument(
  content: string,
  format: 'pdf' | 'html' | 'text',
): Promise<void> {
  const ext = format === 'pdf' ? 'pdf' : format === 'html' ? 'html' : 'txt';
  const mime =
    format === 'pdf'
      ? 'application/pdf'
      : format === 'html'
        ? 'text/html'
        : 'text/plain';

  const filename = `DealGapIQ_LOI_${Date.now()}.${ext}`;
  const file = new File(Paths.cache, filename);
  file.create();
  await file.write(content);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device');

  await Sharing.shareAsync(file.uri, {
    mimeType: mime,
    dialogTitle: 'Share Letter of Intent',
  });
}
