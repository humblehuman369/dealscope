import { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Platform,
  Share,
  Linking,
  useColorScheme,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import Constants from 'expo-constants';
import BottomNavigationSheet from './BottomNavigationSheet';

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
  const [showMenu, setShowMenu] = useState(false);
  const colorScheme = useColorScheme(); // Detect device dark/light mode

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

  const handleShare = useCallback(async () => {
    try {
      setShowMenu(false);
      await Share.share({
        message: `Check out this property analysis: ${address}`,
        url: propertyUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [address, propertyUrl]);

  const handleOpenMenu = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMenu(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleRefresh = () => {
    setHasError(false);
    setErrorMessage('');
    webViewRef.current?.reload();
  };

  const handleGoBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleOpenInBrowser = useCallback(async () => {
    try {
      setShowMenu(false);
      await Linking.openURL(propertyUrl);
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  }, [propertyUrl]);

  // Handle messages from WebView (e.g., menu button click)
  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'OPEN_MENU') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowMenu(true);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  }, []);

  // Inject CSS to hide web header/footer and optimize for mobile
  // Also apply dark mode class based on device color scheme
  const isDarkMode = colorScheme === 'dark';
  const injectedStyles = `
    (function() {
      // Apply dark mode class based on device preference
      var isDark = ${JSON.stringify(isDarkMode)};
      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      
      const style = document.createElement('style');
      style.textContent = \`
        /* Hide notification bell and settings gear specifically */
        /* Target by aria-label */
        button[aria-label="Notifications"],
        button[aria-label="Settings"],
        /* Target by SVG content - bell and settings icons */
        button:has(svg.lucide-bell),
        button:has(svg.lucide-settings) {
          display: none !important;
          visibility: hidden !important;
          width: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
          position: absolute !important;
          pointer-events: none !important;
        }
        
        /* Style for the injected menu button */
        .mobile-menu-btn {
          display: flex !important;
          visibility: visible !important;
          width: auto !important;
          height: auto !important;
          position: relative !important;
          pointer-events: auto !important;
          padding: 8px !important;
          cursor: pointer !important;
          color: #6b7280 !important;
        }
        .mobile-menu-btn:hover {
          color: #374151 !important;
        }
        .dark .mobile-menu-btn {
          color: #9ca3af !important;
        }
        .dark .mobile-menu-btn:hover {
          color: #e5e7eb !important;
        }
        
        /* Optimize body padding for embedded view */
        body { padding-top: 0 !important; }
        
        /* Remove top padding from main container */
        .max-w-7xl { padding-top: 8px !important; }
        
        /* Improve touch targets */
        button, a, input, select { min-height: 44px; }
        
        /* Hide footer in embedded view */
        footer { display: none !important; }
        
        /* Smooth scrolling */
        html { scroll-behavior: smooth; }
      \`;
      document.head.appendChild(style);
      
      // Wait for DOM to be ready, then inject menu button
      // Max 30 retries (3 seconds total) to prevent infinite loops
      var menuButtonRetries = 0;
      var maxMenuButtonRetries = 30;
      
      function injectMenuButton() {
        // Check if menu button already exists
        if (document.querySelector('.mobile-menu-btn')) return;
        
        // Find the header's right section (contains theme toggle, bell, gear)
        var header = document.querySelector('header');
        if (!header) {
          if (menuButtonRetries < maxMenuButtonRetries) {
            menuButtonRetries++;
            setTimeout(injectMenuButton, 100);
          }
          return;
        }
        
        // Find the container with the action buttons
        var actionsContainer = header.querySelector('.flex.items-center.space-x-2');
        if (!actionsContainer) {
          if (menuButtonRetries < maxMenuButtonRetries) {
            menuButtonRetries++;
            setTimeout(injectMenuButton, 100);
          }
          return;
        }
        
        // Create menu button
        var menuBtn = document.createElement('button');
        menuBtn.className = 'mobile-menu-btn';
        menuBtn.setAttribute('aria-label', 'Menu');
        menuBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>';
        
        // Add click handler that posts message to React Native
        menuBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'OPEN_MENU' }));
        });
        
        // Insert at the end of actions container
        actionsContainer.appendChild(menuBtn);
      }
      
      // Run when DOM is ready, using { once: true } to auto-remove listener
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectMenuButton, { once: true });
      } else {
        injectMenuButton();
      }
      
      // Also run after a delay to handle dynamic content
      setTimeout(injectMenuButton, 500);
      setTimeout(injectMenuButton, 1000);
    })();
    true;
  `;

  return (
    <View style={[styles.container, { paddingTop: insets.top }, isDarkMode && styles.containerDark]}>
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
              onMessage={handleWebViewMessage}
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
      
      {/* Floating Back Button - Rendered AFTER WebView to ensure it's on top */}
      <TouchableOpacity
        style={[
          styles.floatingBackButton, 
          { top: 8 },
          isDarkMode && styles.floatingBackButtonDark
        ]}
        onPress={handleGoBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
      >
        <Ionicons
          name="chevron-back"
          size={26}
          color={isDarkMode ? colors.white : colors.gray[700]}
        />
      </TouchableOpacity>

      {/* Bottom Navigation Sheet */}
      <BottomNavigationSheet
        visible={showMenu}
        onClose={handleCloseMenu}
        onShare={handleShare}
        onOpenInBrowser={handleOpenInBrowser}
        propertyAddress={address}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  containerDark: {
    backgroundColor: '#07172e', // navy-900
  },
  floatingBackButton: {
    position: 'absolute',
    left: 8,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  floatingBackButtonDark: {
    backgroundColor: 'rgba(7, 23, 46, 0.9)', // navy-900 with transparency
    shadowColor: '#000',
    shadowOpacity: 0.3,
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

