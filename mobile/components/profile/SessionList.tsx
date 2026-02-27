import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { authApi, type SessionInfo } from '@/services/auth';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function deviceIcon(ua: string | null): keyof typeof Ionicons.glyphMap {
  if (!ua) return 'phone-portrait-outline';
  const lower = ua.toLowerCase();
  if (lower.includes('iphone') || lower.includes('ios')) return 'phone-portrait-outline';
  if (lower.includes('android')) return 'phone-portrait-outline';
  if (lower.includes('mac') || lower.includes('ipad')) return 'laptop-outline';
  if (lower.includes('windows') || lower.includes('linux')) return 'desktop-outline';
  return 'globe-outline';
}

export function SessionList() {
  const qc = useQueryClient();

  const { data: sessions, isLoading } = useQuery<SessionInfo[]>({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authApi.listSessions(),
    staleTime: 30_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
  });

  function handleRevoke(session: SessionInfo) {
    Alert.alert(
      'Revoke Session',
      `End the session on ${session.device_name ?? 'this device'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => revokeMutation.mutate(session.id),
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Sessions</Text>
      {sessions?.map((s) => (
        <View key={s.id} style={styles.sessionRow}>
          <Ionicons
            name={deviceIcon(s.user_agent)}
            size={22}
            color={s.is_current ? colors.accent : colors.secondary}
          />
          <View style={styles.sessionInfo}>
            <Text style={styles.deviceName}>
              {s.device_name ?? 'Unknown device'}
              {s.is_current && (
                <Text style={styles.currentTag}> (this device)</Text>
              )}
            </Text>
            <Text style={styles.sessionMeta}>
              {s.ip_address ?? 'Unknown IP'} · {timeAgo(s.last_active_at)}
            </Text>
          </View>
          {!s.is_current && (
            <Pressable
              onPress={() => handleRevoke(s)}
              hitSlop={8}
              disabled={revokeMutation.isPending}
            >
              <Ionicons name="close-circle-outline" size={22} color={colors.red} />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  center: { padding: spacing.xl, alignItems: 'center' },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.heading,
    marginBottom: spacing.xs,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionInfo: { flex: 1 },
  deviceName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.heading,
  },
  currentTag: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.accent,
  },
  sessionMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 1,
  },
});
