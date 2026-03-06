import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import api from '@/services/api';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created_at: string;
  invoice_pdf_url: string | null;
  receipt_url: string | null;
}

interface PaymentHistoryResponse {
  payments: Payment[];
  total_count: number;
  has_more: boolean;
}

export default function PaymentHistoryScreen() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery<PaymentHistoryResponse>({
    queryKey: ['billing', 'payments'],
    queryFn: async () => {
      const { data } = await api.get<PaymentHistoryResponse>('/api/v1/billing/payments', {
        params: { limit: 50, offset: 0 },
      });
      return data;
    },
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Button title="← Back" variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <Text style={styles.title}>Payment History</Text>
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load payment history.</Text>
        </View>
      )}

      {data && data.payments.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No payments yet.</Text>
        </View>
      )}

      {data && data.payments.length > 0 && (
        <FlatList
          data={data.payments}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.paymentCard, cardGlow.sm]}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
                <Text style={[styles.paymentAmount, { color: item.status === 'succeeded' ? colors.success : colors.error }]}>
                  ${(item.amount / 100).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.paymentDesc}>{item.description ?? 'DealGapIQ Pro'}</Text>
              <View style={[styles.statusPill, { backgroundColor: item.status === 'succeeded' ? colors.successBg : colors.errorBg }]}>
                <Text style={[styles.statusText, { color: item.status === 'succeeded' ? colors.success : colors.error }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  header: { paddingHorizontal: spacing.lg, paddingTop: 56 },
  title: { fontFamily: fontFamilies.heading, fontSize: 22, fontWeight: '700', color: colors.textHeading, marginBottom: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorText: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.error },
  emptyText: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary },
  list: { padding: spacing.lg },
  paymentCard: { backgroundColor: colors.base, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentDate: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textSecondary },
  paymentAmount: { fontFamily: fontFamilies.monoBold, fontSize: 18, fontWeight: '700' },
  paymentDesc: { fontFamily: fontFamilies.body, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, marginTop: spacing.xs },
  statusText: { fontFamily: fontFamilies.heading, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
});
