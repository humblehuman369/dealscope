/**
 * WorksheetExport — download and share proforma reports from mobile.
 *
 * Mirrors frontend WorksheetExport functionality. Downloads Excel/CSV
 * from backend proforma endpoints and opens the native share sheet.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { cacheDirectory, downloadAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../services/apiClient';
import { getAccessToken } from '../../services/authService';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { ProGate } from '../billing/ProGate';

interface WorksheetExportProps {
  propertyId: string;
  address: string;
  strategy: string;
  holdPeriodYears?: number;
}

type ExportFormat = 'excel' | 'pdf';

export function WorksheetExport({
  propertyId,
  address,
  strategy,
  holdPeriodYears = 10,
}: WorksheetExportProps) {
  const { isDark } = useTheme();
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setDownloading(format);
    try {
      const token = getAccessToken();
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const params = new URLSearchParams({
        address,
        strategy,
        hold_period_years: String(holdPeriodYears),
      });
      const url = `${API_BASE_URL}/api/v1/proforma/property/${propertyId}/${format === 'excel' ? 'excel' : 'pdf'}?${params}`;
      const filename = `${address.replace(/[^a-zA-Z0-9]/g, '_')}_worksheet.${ext}`;
      const fileUri = `${cacheDirectory}${filename}`;

      const result = await downloadAsync(url, fileUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (result.status !== 200) {
        throw new Error(`Download failed (${result.status})`);
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType:
            format === 'excel'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'application/pdf',
          dialogTitle: `Share ${format === 'excel' ? 'Excel' : 'PDF'} Report`,
        });
      } else {
        Alert.alert('Downloaded', `Report saved to ${result.uri}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert(
        'Export Failed',
        message || 'Could not download the report. Please try again.',
      );
    } finally {
      setDownloading(null);
    }
  };

  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <ProGate feature="Pro Reports" mode="inline">
      <View style={[styles.container, { borderColor }]}>
        <TouchableOpacity
          style={[styles.button, { borderColor }]}
          onPress={() => handleExport('excel')}
          disabled={downloading !== null}
        >
          {downloading === 'excel' ? (
            <ActivityIndicator size="small" color={colors.accent[500]} />
          ) : (
            <Ionicons name="document-outline" size={18} color={colors.accent[500]} />
          )}
          <View>
            <Text style={[styles.buttonTitle, { color: textColor }]}>
              Excel Report
            </Text>
            <Text style={[styles.buttonSub, { color: mutedColor }]}>
              Full proforma spreadsheet
            </Text>
          </View>
          <Ionicons name="share-outline" size={16} color={mutedColor} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { borderColor }]}
          onPress={() => handleExport('pdf')}
          disabled={downloading !== null}
        >
          {downloading === 'pdf' ? (
            <ActivityIndicator size="small" color={colors.accent[500]} />
          ) : (
            <Ionicons name="document-text-outline" size={18} color={colors.accent[500]} />
          )}
          <View>
            <Text style={[styles.buttonTitle, { color: textColor }]}>
              PDF Report
            </Text>
            <Text style={[styles.buttonSub, { color: mutedColor }]}>
              Shareable summary
            </Text>
          </View>
          <Ionicons name="share-outline" size={16} color={mutedColor} />
        </TouchableOpacity>
      </View>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
