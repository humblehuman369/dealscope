import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

export default function TermsScreen() {
  const router = useRouter();

  useEffect(() => {
    WebBrowser.openBrowserAsync('https://dealgapiq.com/terms').then(() => {
      router.back();
    });
  }, [router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.text}>Opening Terms of Service...</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  text: { ...typography.bodySmall, color: colors.textSecondary },
  link: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
});
