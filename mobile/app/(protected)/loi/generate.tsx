import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { downloadLoiDocument } from '@/services/documents';
import { ProGate } from '@/components/billing/ProGate';
import { GlowCard } from '@/components/ui/GlowCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { formatCurrency } from '@/utils/formatters';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
} from '@/constants/tokens';

interface LOITemplate {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
}

interface LOIPreferences {
  buyer_name?: string;
  buyer_company?: string;
  buyer_email?: string;
  buyer_phone?: string;
}

interface LOIDocument {
  id: string;
  content_text: string;
  content_html?: string;
  pdf_base64?: string;
  property_address: string;
  offer_price: number;
  format_generated: string;
}

export default function LOIGenerateScreen() {
  const router = useRouter();
  const { address, offer_price } = useLocalSearchParams<{
    address?: string;
    offer_price?: string;
  }>();
  const insets = useSafeAreaInsets();

  const decodedAddress = address ? decodeURIComponent(address) : '';
  const initialOffer = offer_price ? Number(offer_price) : 0;

  // Fetch templates
  const { data: templates } = useQuery<LOITemplate[]>({
    queryKey: ['loi', 'templates'],
    queryFn: () => api.get<LOITemplate[]>('/api/v1/loi/templates'),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch saved preferences
  const { data: prefs } = useQuery<LOIPreferences>({
    queryKey: ['loi', 'preferences'],
    queryFn: () => api.get<LOIPreferences>('/api/v1/loi/preferences'),
    staleTime: 5 * 60 * 1000,
  });

  // Form state
  const [buyerName, setBuyerName] = useState('');
  const [buyerCompany, setBuyerCompany] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [offerPrice, setOfferPrice] = useState(
    initialOffer > 0 ? String(initialOffer) : '',
  );
  const [earnestMoney, setEarnestMoney] = useState('1000');
  const [inspectionDays, setInspectionDays] = useState('10');
  const [closingDays, setClosingDays] = useState('30');

  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<LOIDocument | null>(null);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);

  // Populate from prefs
  useEffect(() => {
    if (prefs) {
      if (prefs.buyer_name) setBuyerName(prefs.buyer_name);
      if (prefs.buyer_company) setBuyerCompany(prefs.buyer_company);
      if (prefs.buyer_email) setBuyerEmail(prefs.buyer_email);
      if (prefs.buyer_phone) setBuyerPhone(prefs.buyer_phone);
    }
  }, [prefs]);

  async function handleGenerate() {
    if (!decodedAddress || !offerPrice) return;
    setError('');
    setGenerating(true);
    setGeneratedDoc(null);
    try {
      const parts = decodedAddress.split(',').map((s) => s.trim());
      const doc = await api.post<LOIDocument>('/api/v1/loi/generate', {
        buyer: {
          name: buyerName,
          company: buyerCompany || undefined,
          email: buyerEmail || undefined,
          phone: buyerPhone || undefined,
        },
        property_info: {
          address: parts[0] ?? decodedAddress,
          city: parts[1] ?? '',
          state: parts[2]?.split(' ')[0] ?? '',
          zip_code: parts[2]?.split(' ')[1] ?? '',
        },
        terms: {
          offer_price: Number(offerPrice),
          earnest_money: Number(earnestMoney),
          earnest_money_holder: 'Title Company',
          inspection_period_days: Number(inspectionDays),
          closing_period_days: Number(closingDays),
          offer_expiration_days: 5,
          allow_assignment: true,
          contingencies: ['inspection', 'financing', 'appraisal'],
          is_cash_offer: false,
          seller_concessions: 0,
        },
        format: 'text',
        include_cover_letter: false,
      });
      setGeneratedDoc(doc);

      // Save preferences for next time
      api
        .post('/api/v1/loi/preferences', {
          buyer_name: buyerName,
          buyer_company: buyerCompany,
          buyer_email: buyerEmail,
          buyer_phone: buyerPhone,
        })
        .catch(() => {});
    } catch (err: any) {
      setError(err.message ?? 'LOI generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleShare() {
    if (!generatedDoc) return;
    setSharing(true);
    try {
      const content = generatedDoc.pdf_base64 ?? generatedDoc.content_text;
      const format = generatedDoc.pdf_base64 ? 'pdf' : 'text';
      await downloadLoiDocument(content, format as 'pdf' | 'text');
    } catch (err: any) {
      Alert.alert('Share Failed', err.message ?? 'Could not share document');
    } finally {
      setSharing(false);
    }
  }

  const canGenerate = decodedAddress && buyerName.trim() && Number(offerPrice) > 0;

  return (
    <ProGate feature="LOI generation">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing['2xl'] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.heading} />
            </Pressable>
            <Text style={styles.headerTitle}>Letter of Intent</Text>
            <View style={{ width: 24 }} />
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          {/* Property */}
          {decodedAddress ? (
            <Text style={styles.addressRef} numberOfLines={2}>
              {decodedAddress}
            </Text>
          ) : null}

          {/* Generated preview */}
          {generatedDoc && (
            <GlowCard style={styles.previewCard} active>
              <View style={styles.previewHeader}>
                <Ionicons name="document-text" size={24} color={colors.green} />
                <Text style={styles.previewTitle}>LOI Generated</Text>
              </View>
              <Text style={styles.previewOffer}>
                Offer: {formatCurrency(generatedDoc.offer_price)}
              </Text>
              <Text style={styles.previewText} numberOfLines={8}>
                {generatedDoc.content_text}
              </Text>
              <Button
                title={sharing ? 'Sharing...' : 'Share LOI'}
                onPress={handleShare}
                loading={sharing}
              />
            </GlowCard>
          )}

          {/* Form */}
          {!generatedDoc && (
            <>
              <Text style={styles.sectionTitle}>Buyer Information</Text>
              <View style={styles.formGroup}>
                <Input
                  label="Your Name"
                  icon="person-outline"
                  value={buyerName}
                  onChangeText={setBuyerName}
                  placeholder="John Doe"
                  autoComplete="name"
                />
                <Input
                  label="Company (optional)"
                  icon="business-outline"
                  value={buyerCompany}
                  onChangeText={setBuyerCompany}
                  placeholder="Doe Investments LLC"
                />
                <Input
                  label="Email"
                  icon="mail-outline"
                  value={buyerEmail}
                  onChangeText={setBuyerEmail}
                  placeholder="john@example.com"
                  keyboardType="email-address"
                />
                <Input
                  label="Phone"
                  icon="call-outline"
                  value={buyerPhone}
                  onChangeText={setBuyerPhone}
                  placeholder="(555) 123-4567"
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.sectionTitle}>Offer Terms</Text>
              <View style={styles.formGroup}>
                <Input
                  label="Offer Price"
                  icon="cash-outline"
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  placeholder="350000"
                  keyboardType="number-pad"
                />
                <Input
                  label="Earnest Money"
                  icon="wallet-outline"
                  value={earnestMoney}
                  onChangeText={setEarnestMoney}
                  placeholder="1000"
                  keyboardType="number-pad"
                />
                <View style={styles.splitRow}>
                  <View style={styles.splitHalf}>
                    <Input
                      label="Inspection Days"
                      value={inspectionDays}
                      onChangeText={setInspectionDays}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.splitHalf}>
                    <Input
                      label="Closing Days"
                      value={closingDays}
                      onChangeText={setClosingDays}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>

              <Button
                title={generating ? 'Generating...' : 'Generate LOI'}
                onPress={handleGenerate}
                loading={generating}
                disabled={!canGenerate}
              />
            </>
          )}

          {/* New LOI button after generation */}
          {generatedDoc && (
            <Pressable
              onPress={() => setGeneratedDoc(null)}
              style={styles.newLoiBtn}
            >
              <Text style={styles.newLoiText}>Generate New LOI</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  addressRef: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.heading,
    marginTop: spacing.xs,
  },
  formGroup: {
    gap: spacing.sm,
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  splitHalf: {
    flex: 1,
  },

  // Preview
  previewCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  previewOffer: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  previewText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.body,
    lineHeight: fontSize.sm * 1.6,
    backgroundColor: colors.panel,
    padding: spacing.md,
    borderRadius: radius.md,
  },

  newLoiBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  newLoiText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
});
