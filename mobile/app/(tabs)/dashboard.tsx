import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Get the web app URL from environment or config
 */
function getWebAppUrl(): string {
  const envUrl = Constants.expoConfig?.extra?.webAppUrl || process.env.EXPO_PUBLIC_WEB_APP_URL;
  if (envUrl) return envUrl;
  // Fallback to production URL
  return 'https://investiq.guru';
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const webViewRef = useRef<WebView>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  
  const baseUrl = getWebAppUrl();
  // Direct to dashboard if authenticated, otherwise to home
  const dashboardUrl = isAuthenticated ? `${baseUrl}/dashboard` : baseUrl;

  const handleRefresh = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  const handleGoBack = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.goBack();
  }, []);

  // Inject dark mode CSS if needed
  const injectedJS = isDark ? `
    (function() {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    })();
    true;
  ` : `
    (function() {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    })();
    true;
  `;

  if (hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Unable to Load Dashboard</Text>
          <Text style={[styles.errorText, { color: theme.textMuted }]}>
            Please check your internet connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          paddingTop: insets.top + 8,
          backgroundColor: theme.headerBackground,
          borderBottomColor: theme.headerBorder,
        }
      ]}>
        <View style={styles.headerLeft}>
          {canGoBack && (
            <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
              <Ionicons name="chevron-back" size={24} color={colors.primary[600]} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: theme.text }]}>Dashboard</Text>
        </View>
        
        <TouchableOpacity onPress={handleRefresh} style={styles.headerButton}>
          <Ionicons name="refresh" size={22} color={colors.primary[600]} />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: dashboardUrl }}
        style={styles.webView}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        injectedJavaScript={injectedJS}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        renderLoading={() => (
          <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading dashboard...</Text>
          </View>
        )}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading dashboard...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerButton: {
    padding: 8,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

