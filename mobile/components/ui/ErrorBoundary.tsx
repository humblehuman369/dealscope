import { Component, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

// ---------------------------------------------------------------------------
// Error Boundary (class component — React requires it)
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Short label for Sentry breadcrumbs (e.g., "VerdictScreen") */
  name?: string;
  /** Custom fallback render */
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        componentStack: info.componentStack,
        boundaryName: this.props.name,
      },
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.reset });
    }

    return <ErrorFallback error={error} onRetry={this.reset} />;
  }
}

// ---------------------------------------------------------------------------
// Default error fallback UI
// ---------------------------------------------------------------------------

interface ErrorFallbackProps {
  error: Error;
  onRetry: () => void;
  title?: string;
}

export function ErrorFallback({
  error,
  onRetry,
  title = 'Something went wrong',
}: ErrorFallbackProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="bug-outline" size={40} color={colors.red} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>
        An unexpected error occurred. This has been reported and our team will
        look into it.
      </Text>
      <Text style={styles.errorDetail} numberOfLines={3}>
        {error.message}
      </Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Ionicons name="refresh" size={18} color={colors.black} />
        <Text style={styles.retryText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Global crash screen (used by root error boundary)
// ---------------------------------------------------------------------------

export function GlobalCrashScreen({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <View style={styles.globalContainer}>
      <View style={styles.iconCircle}>
        <Ionicons name="warning" size={48} color={colors.red} />
      </View>
      <Text style={styles.globalTitle}>DealGapIQ Crashed</Text>
      <Text style={styles.message}>
        We're sorry — something unexpected happened. The error has been reported
        automatically.
      </Text>
      <Text style={styles.errorDetail} numberOfLines={4}>
        {error.message}
      </Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Ionicons name="refresh" size={18} color={colors.black} />
        <Text style={styles.retryText}>Restart App</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  globalContainer: {
    flex: 1,
    backgroundColor: colors.base,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.heading,
  },
  globalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: colors.heading,
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.6,
    maxWidth: 300,
  },
  errorDetail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  retryText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.black,
  },
});
