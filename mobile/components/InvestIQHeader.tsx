import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

interface InvestIQHeaderProps {
  title?: string;
  subtitle?: string;
  showNotifications?: boolean;
  showSettings?: boolean;
  onNotificationsPress?: () => void;
  onSettingsPress?: () => void;
}

export default function InvestIQHeader({
  title,
  subtitle,
  showNotifications = true,
  showSettings = true,
  onNotificationsPress,
  onSettingsPress,
}: InvestIQHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isDark, theme } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder }]}>
      <View style={styles.content}>
        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <Image
            source={isDark 
              ? require('../assets/InvestIQ Logo 3D (Dark View).png')
              : require('../assets/InvestIQ Logo 3D (Light View).png')
            }
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.brandName, { color: theme.text }]}>
              Invest<Text style={styles.brandAccent}>IQ</Text>
            </Text>
            {(title || subtitle) && (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {title || subtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {showNotifications && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.iconBackground }]}
              onPress={onNotificationsPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="notifications-outline" size={22} color={theme.textSecondary} />
              {/* Notification badge */}
              <View style={styles.badge} />
            </TouchableOpacity>
          )}
          {showSettings && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.iconBackground }]}
              onPress={onSettingsPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: colors.primary[500],
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
    maxWidth: 200,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.loss.main,
    borderWidth: 2,
    borderColor: colors.white,
  },
});

