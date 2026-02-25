import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../context/ThemeContext';
import { verifyEmail } from '../../services/authService';
import { isValidToken, InvalidParamFallback } from '../../hooks/useValidatedParams';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided.');
        return;
      }

      try {
        const data = await verifyEmail(token);
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired.');
      }
    };

    verify();
  }, [token]);

  if (!isValidToken(token)) return <InvalidParamFallback message="Invalid verification link" />;

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 24, borderWidth: 1, borderColor, alignItems: 'center' }}>

          {/* Loading */}
          {status === 'loading' && (
            <>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#0d948833' : '#f0fdfa', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <ActivityIndicator size="large" color={accentColor} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>
                Verifying your email...
              </Text>
              <Text style={{ fontSize: 14, color: mutedColor, textAlign: 'center' }}>
                Please wait while we verify your email address.
              </Text>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#052e1633' : '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>
                Email Verified!
              </Text>
              <Text style={{ fontSize: 14, color: mutedColor, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                Your email has been verified successfully. You can now sign in to your account.
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/auth/login')}
                style={{ backgroundColor: accentColor, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Sign In</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#450a0a33' : '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="close-circle" size={32} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>
                Verification Failed
              </Text>
              <Text style={{ fontSize: 14, color: mutedColor, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                {message}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/auth/login')}
                style={{ backgroundColor: accentColor, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', width: '100%', marginBottom: 12 }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Go to Login</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:support@dealgapiq.com')}>
                <Text style={{ fontSize: 13, color: mutedColor }}>
                  Need help?{' '}
                  <Text style={{ color: accentColor }}>Contact Support</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

        </View>
      </View>
    </View>
  );
}
