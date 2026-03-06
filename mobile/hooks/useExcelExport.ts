import { Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useMutation } from '@tanstack/react-query';
import api from '@/services/api';
import { getAccessToken } from '@/services/token-manager';

interface ExportParams {
  propertyId: string;
  strategy?: string;
  address?: string;
}

export function useExcelExport() {
  return useMutation({
    mutationFn: async ({ propertyId, strategy = 'ltr', address }: ExportParams) => {
      const token = getAccessToken();
      const baseUrl = api.defaults.baseURL;
      const params = new URLSearchParams({ strategy });
      const url = `${baseUrl}/api/v1/proforma/property/${propertyId}/excel?${params}`;

      const filename = `Proforma_${(address ?? propertyId).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${strategy.toUpperCase()}.xlsx`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const file = new File(Paths.cache, filename);
      file.write(new Uint8Array(buffer));

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `Share ${filename}`,
        });
      } else {
        Alert.alert('Downloaded', `File saved to ${filename}`);
      }

      return file.uri;
    },
    onError: (err: Error) => {
      Alert.alert('Export Failed', err.message ?? 'Could not download the proforma.');
    },
  });
}
