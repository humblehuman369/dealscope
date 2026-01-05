import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 320;

interface BottomNavigationSheetProps {
  visible: boolean;
  onClose: () => void;
  onShare?: () => void;
  onOpenInBrowser?: () => void;
  propertyAddress?: string;
}

interface NavItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  color?: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: 'home-outline', label: 'Home', route: '/(tabs)/home' },
  { icon: 'scan-outline', label: 'Scan', route: '/(tabs)/scan' },
  { icon: 'map-outline', label: 'Map', route: '/(tabs)/map' },
  { icon: 'time-outline', label: 'History', route: '/(tabs)/history' },
  { icon: 'briefcase-outline', label: 'Portfolio', route: '/(tabs)/portfolio' },
];

export default function BottomNavigationSheet({
  visible,
  onClose,
  onShare,
  onOpenInBrowser,
  propertyAddress,
}: BottomNavigationSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      // Slide up with spring animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);
  
  const handleNavPress = async (route: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    // Small delay to let the sheet close before navigating
    setTimeout(() => {
      router.replace(route as any);
    }, 150);
  };
  
  const handleActionPress = async (action: () => void) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };
  
  if (!visible) return null;
  
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View 
          style={[
            styles.backdrop,
            { opacity: backdropAnim }
          ]} 
        />
      </TouchableWithoutFeedback>
      
      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
        
        {/* Navigation Grid */}
        <View style={styles.navGrid}>
          {NAV_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.navItem}
              onPress={() => handleNavPress(item.route)}
              activeOpacity={0.7}
            >
              <View style={styles.navIconContainer}>
                <Ionicons name={item.icon} size={24} color={colors.primary[600]} />
              </View>
              <Text style={styles.navLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Divider */}
        <View style={styles.divider} />
        
        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {onShare && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionPress(onShare)}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={20} color={colors.gray[700]} />
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
          )}
          
          {onOpenInBrowser && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionPress(onOpenInBrowser)}
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={20} color={colors.gray[700]} />
              <Text style={styles.actionLabel}>Open in Browser</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={20} color={colors.gray[500]} />
            <Text style={[styles.actionLabel, { color: colors.gray[500] }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navItem: {
    alignItems: 'center',
    width: '20%',
    paddingVertical: 8,
  },
  navIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray[700],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginHorizontal: 24,
    marginVertical: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[700],
  },
});

