import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import api from '@/services/api';

export default function DealMakerScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!address) return;
    const webBase = (api.defaults.baseURL ?? 'https://api.dealgapiq.com')
      .replace('api.', '')
      .replace('api-staging.', 'staging.');
    const url = `https://dealgapiq.com/deal-maker?address=${encodeURIComponent(address)}`;
    WebBrowser.openBrowserAsync(url).then(() => {
      router.back();
    });
  }, [address]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Opening Deal Maker...</Text>
      <Button
        title="Go Back"
        variant="ghost"
        onPress={() => router.back()}
        style={{ marginTop: spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  text: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary, marginTop: spacing.md },
});
