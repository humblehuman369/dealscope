import { View, Text, FlatList, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui';
import { useSavedProperties, useDeleteSavedProperty } from '@/hooks/useSavedProperties';
import type { SavedPropertySummary } from '@/hooks/useSavedProperties';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { getScoreColor } from '@/constants/theme';

function fmtC(v: number | null | undefined): string {
  if (v == null) return '';
  return '$' + Math.round(v).toLocaleString();
}

function getDisplayAddress(item: SavedPropertySummary): string {
  const stateZip = [item.address_state, item.address_zip].filter(Boolean).join(' ');
  const parts = [item.address_street, item.address_city, stateZip].filter(Boolean);
  return parts.join(', ').trim() || item.address_street;
}

export default function SavedPropertiesScreen() {
  const router = useRouter();
  const { data: properties, isLoading } = useSavedProperties({
    page: 0,
    pageSize: 50,
    status: 'all',
    search: '',
  });
  const deleteMutation = useDeleteSavedProperty();

  function handleDelete(id: string) {
    Alert.alert('Remove Property', 'Remove this property from your saved list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Deal Vault</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const displayAddress = getDisplayAddress(item);
          return (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/verdict', params: { address: displayAddress } })
              }
              onLongPress={() => handleDelete(item.id)}
            >
              <Card glow="sm" style={styles.propCard}>
                <View style={styles.propHeader}>
                  <Text style={styles.propAddress} numberOfLines={2}>
                    {item.nickname ?? displayAddress}
                  </Text>
                  {item.best_cash_flow != null && (
                    <View style={[styles.scoreBadge, { backgroundColor: (item.best_cash_flow >= 0 ? colors.success : colors.error) + '20' }]}>
                      <Text style={[styles.scoreText, { color: item.best_cash_flow >= 0 ? colors.success : colors.error }]}>
                        {fmtC(item.best_cash_flow)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.propMeta}>
                  {[
                    item.status !== 'watching' && item.status,
                    item.best_strategy,
                    item.best_coc_return != null && `${item.best_coc_return.toFixed(1)}% CoC`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No Saved Properties</Text>
              <Text style={styles.emptySubtitle}>
                Analyze a property and tap the bookmark icon to save it here
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backArrow: { fontSize: 22, color: colors.textBody },
  headerTitle: { ...typography.h3, color: colors.textHeading },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  propCard: { padding: spacing.md, gap: spacing.xs },
  propHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  propAddress: { ...typography.h4, color: colors.textHeading, flex: 1, marginRight: spacing.sm },
  scoreBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  scoreText: { fontFamily: fontFamilies.monoBold, fontSize: 14, fontWeight: '700' },
  propMeta: { ...typography.caption, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: spacing['2xl'] },
  emptyTitle: { ...typography.h3, color: colors.textHeading, marginBottom: spacing.sm },
  emptySubtitle: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', maxWidth: 260 },
});
