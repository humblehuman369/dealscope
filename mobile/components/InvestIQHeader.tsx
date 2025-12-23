import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

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

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.content}>
        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="analytics" size={24} color={colors.primary[600]} />
          </View>
          <View>
            <Text style={styles.brandName}>InvestIQ</Text>
            {(title || subtitle) && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {title || subtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {showNotifications && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onNotificationsPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.gray[700]} />
              {/* Notification badge */}
              <View style={styles.badge} />
            </TouchableOpacity>
          )}
          {showSettings && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSettingsPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={22} color={colors.gray[700]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
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
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.gray[500],
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
    backgroundColor: colors.gray[100],
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

