/**
 * ErrorBoundary — Catches render errors and displays a recovery UI.
 *
 * Usage:
 *   <ErrorBoundary>           → full-screen fallback (global)
 *   <ErrorBoundary inline>    → inline fallback (screen-level)
 *
 * Automatically reports errors to Sentry in production.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Props & State ───────────────────────────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Render an inline card instead of full-screen fallback */
  inline?: boolean;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Called when error is caught (analytics, logging, etc.) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

// ─── Component ───────────────────────────────────────────────────
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Report to Sentry if available
    try {
      const Sentry = require('@sentry/react-native');
      Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    } catch {
      // Sentry not available — no-op
    }

    // Log for development
    if (__DEV__) {
      console.error('[ErrorBoundary]', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  // ─── Render ──────────────────────────────────────────────────
  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Custom fallback takes priority
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error, showDetails } = this.state;
    const errorMessage = error?.message || 'An unexpected error occurred';

    // Inline variant — compact card for screen-level boundaries
    if (this.props.inline) {
      return (
        <View style={inlineStyles.container}>
          <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={inlineStyles.title}>Something went wrong</Text>
          <Text style={inlineStyles.message} numberOfLines={2}>{errorMessage}</Text>
          <TouchableOpacity style={inlineStyles.retryBtn} onPress={this.handleRetry} activeOpacity={0.7}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={inlineStyles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Full-screen variant — global error boundary
    return (
      <View style={fullStyles.container}>
        <View style={fullStyles.content}>
          <View style={fullStyles.iconRing}>
            <Ionicons name="warning-outline" size={48} color="#EF4444" />
          </View>

          <Text style={fullStyles.title}>Something Went Wrong</Text>
          <Text style={fullStyles.subtitle}>
            The app encountered an unexpected error. This has been reported automatically.
          </Text>

          <TouchableOpacity style={fullStyles.retryBtn} onPress={this.handleRetry} activeOpacity={0.7}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={fullStyles.retryText}>Reload</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              style={fullStyles.detailsToggle}
              onPress={() => this.setState({ showDetails: !showDetails })}
            >
              <Text style={fullStyles.detailsToggleText}>
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Text>
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#94A3B8"
              />
            </TouchableOpacity>
          )}

          {showDetails && (
            <ScrollView style={fullStyles.detailsScroll} contentContainerStyle={fullStyles.detailsContent}>
              <Text style={fullStyles.detailsText}>{error?.stack || errorMessage}</Text>
            </ScrollView>
          )}
        </View>
      </View>
    );
  }
}

// ─── Convenience wrapper for screen-level error catching ─────────
export function ScreenErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary inline>{children}</ErrorBoundary>;
}

// ─── Styles ──────────────────────────────────────────────────────
const fullStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 340,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0891B2',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 20,
    padding: 8,
  },
  detailsToggleText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  detailsScroll: {
    maxHeight: 200,
    width: '100%',
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  detailsContent: {
    padding: 12,
  },
  detailsText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
});

const inlineStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    margin: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 12,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0891B2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ErrorBoundary;
