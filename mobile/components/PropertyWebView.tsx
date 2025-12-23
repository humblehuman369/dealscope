import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Platform,
  Share,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface PropertyWebViewProps {
  address: string;
  onClose?: () => void;
}

export default function PropertyWebView({ address, onClose }: PropertyWebViewProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  // Construct the web app URL with the address
  // In production, this should point to your deployed web app
  const baseUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || 'http://localhost:3000';
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
    webViewRef.current?.reload();
  };

  const handleGoBack = () => {
    if (canGoBack) {
      webViewRef.current?.goBack();
    } else if (onClose) {
      onClose();
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleGoBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={canGoBack ? 'chevron-back' : 'close'}
            size={24}
            color={colors.gray[900]}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerBrand}>InvestIQ</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {address}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleRefresh}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="refresh-outline" size={22} color={colors.gray[700]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={Platform.OS === 'ios' ? 'share-outline' : 'share-social-outline'}
              size={22}
              color={colors.gray[700]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* WebView */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: propertyUrl }}
          style={styles.webView}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  headerButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary[700],
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
});

