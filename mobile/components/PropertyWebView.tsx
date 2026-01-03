import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Platform,
  Share,
  Linking,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import Constants from 'expo-constants';

interface PropertyWebViewProps {
  address: string;
  onClose?: () => void;
  onFallbackToNative?: () => void;
}

export default function PropertyWebView({ address, onClose, onFallbackToNative }: PropertyWebViewProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Get the web app URL from environment or use a deployed URL
  // For production, set EXPO_PUBLIC_WEB_APP_URL in your .env or app.json
  const getWebAppUrl = () => {
    // Check for environment variable first
    const envUrl = Constants.expoConfig?.extra?.webAppUrl || process.env.EXPO_PUBLIC_WEB_APP_URL;
    if (envUrl) return envUrl;
    
    // For development on physical device, you need to use your computer's local IP
    // Example: 'http://192.168.1.100:3000'
    // Or deploy the web app and use the deployed URL
    
    // Default fallback - this won't work on physical devices
    return 'http://localhost:3000';
  };
  
  const baseUrl = getWebAppUrl();
  const propertyUrl = `${baseUrl}/property?address=${encodeURIComponent(address)}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this property analysis: ${address}`,
        url: propertyUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRefresh = () => {
    setHasError(false);
    setErrorMessage('');
    webViewRef.current?.reload();
  };

  const handleGoBack = () => {
    if (canGoBack) {
      webViewRef.current?.goBack();
    } else if (onClose) {
      onClose();
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView error:', nativeEvent);
    setHasError(true);
    setErrorMessage(nativeEvent.description || 'Failed to load the web app');
  };

  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView HTTP error:', nativeEvent);
    if (nativeEvent.statusCode >= 400) {
      setHasError(true);
      setErrorMessage(`Server error (${nativeEvent.statusCode})`);
    }
  };

  const handleOpenInBrowser = async () => {
    try {
      await Linking.openURL(propertyUrl);
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  // Inject CSS to hide web header/footer and optimize for mobile
  const injectedStyles = `
    (function() {
      const style = document.createElement('style');
      style.textContent = \`
        /* Hide web header if needed - the mobile app provides navigation */
        header.bg-white.border-b { display: none !important; }
        
        /* Optimize body padding for embedded view */
        body { padding-top: 0 !important; }
        
        /* Improve touch targets */
        button, a, input, select { min-height: 44px; }
        
        /* Hide footer in embedded view */
        footer { display: none !important; }
        
        /* Smooth scrolling */
        html { scroll-behavior: smooth; }
      \`;
      document.head.appendChild(style);
    })();
    true;
  `;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Floating Close Button */}
      <TouchableOpacity
        style={styles.floatingCloseButton}
        onPress={handleGoBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={canGoBack ? 'chevron-back' : 'close'}
          size={22}
          color={colors.gray[700]}
        />
      </TouchableOpacity>

      {/* WebView or Error View */}
      <View style={styles.webViewContainer}>
        {hasError ? (
          /* Error State UI */
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="cloud-offline-outline" size={64} color={colors.gray[400]} />
            </View>
            <Text style={styles.errorTitle}>Unable to Load Web App</Text>
            <Text style={styles.errorDescription}>
              {errorMessage || 'The web app is not available. This usually means the web server is not running or not deployed.'}
            </Text>
            
            <View style={styles.errorActions}>
              {/* Retry Button */}
              <TouchableOpacity style={styles.errorButton} onPress={handleRefresh}>
                <Ionicons name="refresh-outline" size={20} color={colors.white} />
                <Text style={styles.errorButtonText}>Try Again</Text>
              </TouchableOpacity>
              
              {/* Use Native View Button */}
              {onFallbackToNative && (
                <TouchableOpacity 
                  style={[styles.errorButton, styles.errorButtonSecondary]} 
                  onPress={onFallbackToNative}
                >
                  <Ionicons name="phone-portrait-outline" size={20} color={colors.primary[600]} />
                  <Text style={[styles.errorButtonText, styles.errorButtonTextSecondary]}>
                    Use Native View
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Open in Browser */}
              <TouchableOpacity 
                style={[styles.errorButton, styles.errorButtonOutline]} 
                onPress={handleOpenInBrowser}
              >
                <Ionicons name="open-outline" size={20} color={colors.gray[600]} />
                <Text style={[styles.errorButtonText, styles.errorButtonTextOutline]}>
                  Open in Browser
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Setup Instructions */}
            <View style={styles.setupHint}>
              <Ionicons name="information-circle-outline" size={18} color={colors.gray[500]} />
              <Text style={styles.setupHintText}>
                To fix this, deploy your web app and set EXPO_PUBLIC_WEB_APP_URL in your environment.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <WebView
              ref={webViewRef}
              source={{ uri: propertyUrl }}
              style={styles.webView}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onNavigationStateChange={(navState: WebViewNavigation) => {
                setCanGoBack(navState.canGoBack);
              }}
              onError={handleError}
              onHttpError={handleHttpError}
              injectedJavaScript={injectedStyles}
              // Performance optimizations
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              scalesPageToFit
              // Allow gestures
              allowsBackForwardNavigationGestures
              // iOS specific
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              // Android specific
              mixedContentMode="always"
              // Pull to refresh (iOS)
              pullToRefreshEnabled
              // Scroll settings
              overScrollMode="content"
              bounces
              showsVerticalScrollIndicator
              showsHorizontalScrollIndicator={false}
            />

            {/* Loading overlay */}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary[600]} />
                <Text style={styles.loadingText}>Loading property analysis...</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  floatingCloseButton: {
    position: 'absolute',
    top: 8,
    left: 12,
    zIndex: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.gray[600],
  },
  // Error State Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.gray[50],
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 12,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorActions: {
    width: '100%',
    gap: 12,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  errorButtonSecondary: {
    backgroundColor: colors.primary[50],
    borderWidth: 2,
    borderColor: colors.primary[200],
  },
  errorButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  errorButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  errorButtonTextSecondary: {
    color: colors.primary[600],
  },
  errorButtonTextOutline: {
    color: colors.gray[600],
  },
  setupHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
  },
  setupHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.gray[600],
    lineHeight: 18,
  },
});

