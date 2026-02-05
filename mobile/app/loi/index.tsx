import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';

import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { loiService, calculateDefaultEarnestMoney, formatLOIAmount } from '../../services/loiService';
import type { LOIFormat, ContingencyType, BuyerInfo, LOIDocument } from '../../types';
import { DEFAULT_LOI_TERMS, CONTINGENCY_LABELS } from '../../types';

const CONTINGENCY_OPTIONS: ContingencyType[] = ['inspection', 'financing', 'title', 'appraisal', 'partner_approval', 'attorney_review'];

export default function LOIScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ address?: string; offerPrice?: string }>();
  const { theme, isDark } = useTheme();

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLOI, setGeneratedLOI] = useState<LOIDocument | null>(null);

  // Form state - Buyer Info
  const [buyerName, setBuyerName] = useState('');
  const [buyerCompany, setBuyerCompany] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  // Form state - Property
  const [propertyAddress, setPropertyAddress] = useState(params.address || '');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyState, setPropertyState] = useState('FL');
  const [propertyZip, setPropertyZip] = useState('');

  // Form state - Terms
  const [offerPrice, setOfferPrice] = useState(params.offerPrice || '');
  const [earnestMoney, setEarnestMoney] = useState('1000');
  const [inspectionDays, setInspectionDays] = useState('14');
  const [closingDays, setClosingDays] = useState('30');
  const [contingencies, setContingencies] = useState<ContingencyType[]>(['inspection', 'title']);
  const [isCashOffer, setIsCashOffer] = useState(true);
  const [additionalTerms, setAdditionalTerms] = useState('');

  // Update earnest money when offer price changes
  useEffect(() => {
    if (offerPrice) {
      const price = parseFloat(offerPrice.replace(/[^0-9.]/g, ''));
      if (price > 0) {
        setEarnestMoney(calculateDefaultEarnestMoney(price).toString());
      }
    }
  }, [offerPrice]);

  // Load preferences
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await loiService.getPreferences();
      if (prefs.default_buyer) {
        setBuyerName(prefs.default_buyer.name || '');
        setBuyerCompany(prefs.default_buyer.company || '');
        setBuyerEmail(prefs.default_buyer.email || '');
        setBuyerPhone(prefs.default_buyer.phone || '');
      }
      if (prefs.default_contingencies) {
        setContingencies(prefs.default_contingencies);
      }
    } catch (error) {
      // Ignore - use defaults
    }
  };

  const toggleContingency = (contingency: ContingencyType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setContingencies((prev) =>
      prev.includes(contingency) ? prev.filter((c) => c !== contingency) : [...prev, contingency]
    );
  };

  const handleGenerate = async () => {
    if (!propertyAddress || !offerPrice) {
      Alert.alert('Required Fields', 'Please enter property address and offer price');
      return;
    }

    if (!buyerName) {
      Alert.alert('Required Fields', 'Please enter buyer name');
      return;
    }

    try {
      setIsGenerating(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const loi = await loiService.generateLOI({
        buyer: {
          name: buyerName,
          company: buyerCompany || undefined,
          email: buyerEmail || undefined,
          phone: buyerPhone || undefined,
        },
        property_info: {
          address: propertyAddress,
          city: propertyCity,
          state: propertyState,
          zip_code: propertyZip,
        },
        terms: {
          offer_price: parseFloat(offerPrice.replace(/[^0-9.]/g, '')),
          earnest_money: parseFloat(earnestMoney),
          earnest_money_holder: 'Title Company',
          inspection_period_days: parseInt(inspectionDays),
          closing_period_days: parseInt(closingDays),
          offer_expiration_days: 3,
          allow_assignment: true,
          assignment_fee_disclosed: false,
          contingencies,
          include_personal_property: false,
          seller_concessions: 0,
          additional_terms: additionalTerms || undefined,
          is_cash_offer: isCashOffer,
          proof_of_funds_included: false,
        },
        format: 'pdf',
        include_cover_letter: true,
        professional_letterhead: true,
        include_signature_lines: true,
      });

      setGeneratedLOI(loi);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate LOI');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!generatedLOI?.pdf_base64) {
      Alert.alert('Error', 'No PDF to share');
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // In a real implementation, save base64 to file and share
      Alert.alert('Share', 'LOI would be shared via system share sheet');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share');
    }
  };

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    header: { backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder },
    title: { color: theme.text },
    section: { backgroundColor: theme.card, borderColor: isDark ? colors.primary[700] : colors.primary[200] },
    sectionTitle: { color: theme.sectionTitle },
    label: { color: theme.textSecondary },
    input: { backgroundColor: theme.backgroundTertiary, color: theme.text, borderColor: theme.border },
  };

  // Show generated LOI
  if (generatedLOI) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => setGeneratedLOI(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, dynamicStyles.title]}>LOI Generated</Text>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={colors.primary[500]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={[styles.successCard, dynamicStyles.section]}>
            <Ionicons name="checkmark-circle" size={64} color={colors.profit.main} />
            <Text style={[styles.successTitle, { color: theme.text }]}>LOI Ready!</Text>
            <Text style={[styles.successText, { color: theme.textMuted }]}>
              Your Letter of Intent for {generatedLOI.property_address} has been generated.
            </Text>

            <View style={styles.loiSummary}>
              <View style={styles.loiSummaryRow}>
                <Text style={[styles.loiLabel, { color: theme.textMuted }]}>Offer Price</Text>
                <Text style={[styles.loiValue, { color: theme.text }]}>
                  {formatLOIAmount(generatedLOI.offer_price)}
                </Text>
              </View>
              <View style={styles.loiSummaryRow}>
                <Text style={[styles.loiLabel, { color: theme.textMuted }]}>Earnest Money</Text>
                <Text style={[styles.loiValue, { color: theme.text }]}>
                  {formatLOIAmount(generatedLOI.earnest_money)}
                </Text>
              </View>
              <View style={styles.loiSummaryRow}>
                <Text style={[styles.loiLabel, { color: theme.textMuted }]}>Inspection Period</Text>
                <Text style={[styles.loiValue, { color: theme.text }]}>{generatedLOI.inspection_days} days</Text>
              </View>
              <View style={styles.loiSummaryRow}>
                <Text style={[styles.loiLabel, { color: theme.textMuted }]}>Closing Period</Text>
                <Text style={[styles.loiValue, { color: theme.text }]}>{generatedLOI.closing_days} days</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share" size={20} color="#fff" />
              <Text style={styles.shareButtonText}>Share LOI</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, dynamicStyles.title]}>Create LOI</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Buyer Information */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>BUYER INFORMATION</Text>
          <View style={[styles.section, dynamicStyles.section]}>
            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Name *</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={buyerName}
                onChangeText={setBuyerName}
                placeholder="Your legal name"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Company/LLC</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={buyerCompany}
                onChangeText={setBuyerCompany}
                placeholder="Entity name (optional)"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, dynamicStyles.label]}>Email</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={buyerEmail}
                  onChangeText={setBuyerEmail}
                  placeholder="email@example.com"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="email-address"
                />
              </View>
              <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
                <Text style={[styles.label, dynamicStyles.label]}>Phone</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={buyerPhone}
                  onChangeText={setBuyerPhone}
                  placeholder="(555) 555-5555"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Property Information */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>PROPERTY INFORMATION</Text>
          <View style={[styles.section, dynamicStyles.section]}>
            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Address *</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={propertyAddress}
                onChangeText={setPropertyAddress}
                placeholder="123 Main Street"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 2 }]}>
                <Text style={[styles.label, dynamicStyles.label]}>City</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={propertyCity}
                  onChangeText={setPropertyCity}
                  placeholder="City"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={[styles.field, { width: 60, marginHorizontal: 8 }]}>
                <Text style={[styles.label, dynamicStyles.label]}>State</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={propertyState}
                  onChangeText={setPropertyState}
                  placeholder="FL"
                  placeholderTextColor={theme.textMuted}
                  maxLength={2}
                />
              </View>
              <View style={[styles.field, { width: 80 }]}>
                <Text style={[styles.label, dynamicStyles.label]}>ZIP</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={propertyZip}
                  onChangeText={setPropertyZip}
                  placeholder="33401"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>OFFER TERMS</Text>
          <View style={[styles.section, dynamicStyles.section]}>
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, dynamicStyles.label]}>Offer Price *</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  placeholder="$450,000"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
                <Text style={[styles.label, dynamicStyles.label]}>Earnest Money</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={earnestMoney}
                  onChangeText={setEarnestMoney}
                  placeholder="$1,000"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, dynamicStyles.label]}>Inspection Days</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={inspectionDays}
                  onChangeText={setInspectionDays}
                  placeholder="14"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
                <Text style={[styles.label, dynamicStyles.label]}>Closing Days</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={closingDays}
                  onChangeText={setClosingDays}
                  placeholder="30"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Contingencies</Text>
              <View style={styles.contingencyGrid}>
                {CONTINGENCY_OPTIONS.map((contingency) => (
                  <TouchableOpacity
                    key={contingency}
                    style={[
                      styles.contingencyChip,
                      {
                        borderColor: contingencies.includes(contingency)
                          ? colors.primary[500]
                          : theme.border,
                        backgroundColor: contingencies.includes(contingency)
                          ? isDark
                            ? colors.primary[900]
                            : colors.primary[50]
                          : 'transparent',
                      },
                    ]}
                    onPress={() => toggleContingency(contingency)}
                  >
                    <Ionicons
                      name={contingencies.includes(contingency) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={contingencies.includes(contingency) ? colors.primary[500] : theme.textMuted}
                    />
                    <Text
                      style={[
                        styles.contingencyText,
                        {
                          color: contingencies.includes(contingency)
                            ? colors.primary[isDark ? 300 : 600]
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {CONTINGENCY_LABELS[contingency]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Additional Terms</Text>
              <TextInput
                style={[styles.input, styles.textArea, dynamicStyles.input]}
                value={additionalTerms}
                onChangeText={setAdditionalTerms}
                placeholder="Any additional terms or conditions..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Generate LOI</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8, marginLeft: -8 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  sectionWrapper: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  section: { borderRadius: 16, borderWidth: 1.5, padding: 16 },
  field: { marginBottom: 12 },
  fieldRow: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
  contingencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contingencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  contingencyText: { fontSize: 12, fontWeight: '500' },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonDisabled: { backgroundColor: colors.gray[400] },
  generateButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  successCard: { alignItems: 'center', padding: 24, borderRadius: 16, borderWidth: 1.5 },
  successTitle: { fontSize: 24, fontWeight: '700', marginTop: 16 },
  successText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  loiSummary: { width: '100%', marginTop: 24 },
  loiSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  loiLabel: { fontSize: 14 },
  loiValue: { fontSize: 14, fontWeight: '600' },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
    gap: 8,
  },
  shareButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
