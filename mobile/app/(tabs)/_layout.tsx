import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { isDark: isDarkMode, theme } = useTheme();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarActiveTintColor: isDarkMode ? colors.primary[400] : colors.primary[600],
        tabBarInactiveTintColor: isDarkMode ? colors.gray[500] : colors.gray[400],
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#07172e' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : colors.gray[200],
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontWeight: '500',
          fontSize: 11,
          marginTop: 4,
        },
        headerShown: false,
        // Disable swipe gesture between tabs to prevent conflicts with sliders
        swipeEnabled: false,
      }}
    >
      {/* Hidden index route that redirects to home */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'DealHubIQ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'DealHub IQ dashboard tab',
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-outline" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Scan a property tab',
        }}
      />
      {/* Map is hidden from tab bar but accessible from More/Settings */}
      <Tabs.Screen
        name="map"
        options={{
          href: null, // Hide from tab bar - accessible via More menu
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Search history tab',
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Saved properties portfolio tab',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Settings and more options tab',
        }}
      />
    </Tabs>
  );
}

