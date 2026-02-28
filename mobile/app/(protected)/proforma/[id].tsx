import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProGate } from '@/components/billing/ProGate';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  downloadProformaExcel,
  downloadProformaPdf,
} from '@/services/documents';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

type Format = 'excel' | 'pdf';

export default function ProformaScreen() {
  const router = useRouter();
  const { id, address } = useLocalSearchParams<{
    id: string;
    address?: string;
  }>();
  const insets = useSafeAreaInsets();

  const [downloading, setDownloading] = useState<Format | null>(null);
  const [error, setError] = useState('');

  const decodedAddress = address ? decodeURIComponent(address) : '';

  async function handleDownload(format: Format) {
    if (!id) return;
    setError('');
    setDownloading(format);
    try {
      if (format === 'excel') {
        await downloadProformaExcel(id, decodedAddress);
      } else {
        await downloadProformaPdf(id, decodedAddress);
      }
    } catch (err: any) {
      setError(err.message ?? 'Download failed');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <ProGate feature="Proforma export">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing['2xl'],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.heading} />
          </Pressable>
          <Text style={styles.headerTitle}>Proforma</Text>
          <View style={{ width: 24 }} />
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        {/* Property ref */}
        {decodedAddress ? (
          <Text style={styles.addressRef} numberOfLines={2}>
            {decodedAddress}
          </Text>
        ) : null}

        {/* Excel download */}
        <GlowCard style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(52, 211, 153, 0.12)' }]}>
              <Ionicons name="document-outline" size={28} color={colors.green} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Excel Proforma</Text>
              <Text style={styles.cardDesc}>
                Full financial model with cash flow projections, assumptions,
                and scenario analysis.
              </Text>
            </View>
          </View>
          <Button
            title={downloading === 'excel' ? 'Generating...' : 'Download & Share'}
            onPress={() => handleDownload('excel')}
            loading={downloading === 'excel'}
            disabled={downloading !== null}
          />
        </GlowCard>

        {/* PDF download */}
        <GlowCard style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(248, 113, 113, 0.12)' }]}>
              <Ionicons name="document-text-outline" size={28} color={colors.red} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>PDF Report</Text>
              <Text style={styles.cardDesc}>
                Investor-ready summary with key metrics, charts, and deal
                analysis — perfect for sharing with partners.
              </Text>
            </View>
          </View>
          <Button
            title={downloading === 'pdf' ? 'Generating...' : 'Download & Share'}
            onPress={() => handleDownload('pdf')}
            loading={downloading === 'pdf'}
            disabled={downloading !== null}
            variant="secondary"
          />
        </GlowCard>

        {/* Info */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={18} color={colors.secondary} />
          <Text style={styles.infoText}>
            Files are generated on-demand and shared via your device&apos;s native
            share sheet (AirDrop, email, save to Files, etc.).
          </Text>
        </View>
      </ScrollView>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.base },
  content: { paddingHorizontal: spacing.md, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  addressRef: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  card: {
    padding: spacing.md,
    gap: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.heading,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    lineHeight: fontSize.sm * 1.5,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    lineHeight: fontSize.xs * 1.6,
  },
});
