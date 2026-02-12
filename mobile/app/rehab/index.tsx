/**
 * Rehab Estimator Screen - Quick and Detailed estimate modes
 * Route: /rehab
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';

type Condition = 'excellent' | 'good' | 'fair' | 'poor';

const CONDITION_RANGES: Record<Condition, { min: number; max: number }> = {
  excellent: { min: 0.01, max: 0.03 },
  good: { min: 0.03, max: 0.08 },
  fair: { min: 0.08, max: 0.15 },
  poor: { min: 0.15, max: 0.25 },
};

const DETAILED_CATEGORIES = [
  { id: 'kitchen', label: 'Kitchen', min: 5000, max: 50000 },
  { id: 'bathrooms', label: 'Bathrooms', min: 3000, max: 25000 },
  { id: 'flooring', label: 'Flooring', min: 2000, max: 15000 },
  { id: 'paint', label: 'Paint/Walls', min: 1000, max: 8000 },
  { id: 'roof', label: 'Roof', min: 5000, max: 20000 },
  { id: 'hvac', label: 'HVAC', min: 3000, max: 12000 },
  { id: 'plumbing', label: 'Plumbing', min: 2000, max: 10000 },
  { id: 'electrical', label: 'Electrical', min: 2000, max: 10000 },
  { id: 'windows', label: 'Windows', min: 3000, max: 15000 },
  { id: 'exterior', label: 'Exterior/Landscaping', min: 2000, max: 10000 },
] as const;

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function parseNum(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export default function RehabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark } = useTheme();

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0f172a' : '#f1f5f9';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  const [mode, setMode] = useState<'quick' | 'detailed'>('quick');

  const [propertyPrice, setPropertyPrice] = useState('');
  const [condition, setCondition] = useState<Condition>('good');
  const [sqft, setSqft] = useState('');

  const [detailedValues, setDetailedValues] = useState<Record<string, string>>(
    DETAILED_CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: '' }), {})
  );
  const [bathroomCount, setBathroomCount] = useState('1');

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const quickTotal = (() => {
    const price = parseNum(propertyPrice);
    if (price <= 0) return 0;
    const { min, max } = CONDITION_RANGES[condition];
    const pct = (min + max) / 2;
    return Math.round(price * pct);
  })();

  const detailedTotal = (() => {
    let total = 0;
    const bathCount = Math.max(1, parseInt(bathroomCount, 10) || 1);
    for (const cat of DETAILED_CATEGORIES) {
      if (cat.id === 'bathrooms') {
        total += parseNum(detailedValues[cat.id] || '0') * bathCount;
      } else {
        total += parseNum(detailedValues[cat.id] || '0');
      }
    }
    return total;
  })();

  const total = mode === 'quick' ? quickTotal : detailedTotal;
  const sqftNum = parseInt(sqft, 10) || 0;
  const perSqft = sqftNum > 0 ? total / sqftNum : 0;

  const handleSaveEstimate = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Estimate Saved',
      `Your rehab estimate of ${formatCurrency(total)} has been saved.`,
      [{ text: 'OK' }]
    );
  }, [total]);

  const updateDetailed = (id: string, value: string) => {
    setDetailedValues((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Rehab Estimator</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.modeSwitch, { borderBottomColor: borderColor }]}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              mode === 'quick' && { borderBottomColor: accentColor, borderBottomWidth: 2 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMode('quick');
            }}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: mode === 'quick' ? accentColor : mutedColor },
              ]}
            >
              Quick Estimate
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              mode === 'detailed' && { borderBottomColor: accentColor, borderBottomWidth: 2 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMode('detailed');
            }}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: mode === 'detailed' ? accentColor : mutedColor },
              ]}
            >
              Detailed Estimate
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.totalCard, { backgroundColor: accentColor }]}>
              <Text style={styles.totalLabel}>Total Rehab Cost</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              {sqftNum > 0 && (
                <Text style={styles.totalSub}>
                  {formatCurrency(perSqft)}/sqft
                </Text>
              )}
            </View>

            {mode === 'quick' ? (
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardTitle, { color: mutedColor }]}>Quick Estimate</Text>
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>Property Price</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                    placeholder="$350,000"
                    placeholderTextColor={mutedColor}
                    keyboardType="numeric"
                    value={propertyPrice}
                    onChangeText={setPropertyPrice}
                  />
                </View>
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>Condition</Text>
                  <View style={styles.conditionRow}>
                    {(['excellent', 'good', 'fair', 'poor'] as const).map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.conditionBtn,
                          {
                            backgroundColor: condition === c ? accentColor + '30' : inputBg,
                            borderColor: condition === c ? accentColor : borderColor,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setCondition(c);
                        }}
                      >
                        <Text
                          style={[
                            styles.conditionBtnText,
                            { color: condition === c ? accentColor : textColor },
                          ]}
                        >
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>Sqft (optional)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                    placeholder="1500"
                    placeholderTextColor={mutedColor}
                    keyboardType="numeric"
                    value={sqft}
                    onChangeText={setSqft}
                  />
                </View>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.cardTitle, { color: mutedColor }]}>Detailed Estimate</Text>
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>Sqft (optional)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                    placeholder="1500"
                    placeholderTextColor={mutedColor}
                    keyboardType="numeric"
                    value={sqft}
                    onChangeText={setSqft}
                  />
                </View>
                {DETAILED_CATEGORIES.map((cat) => (
                  <View key={cat.id} style={styles.inputRow}>
                    <Text style={[styles.inputLabel, { color: textColor }]}>
                      {cat.label}
                      {cat.id === 'bathrooms' ? ' (each)' : ''}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                      placeholder={`${formatCurrency(cat.min)}–${formatCurrency(cat.max)}`}
                      placeholderTextColor={mutedColor}
                      keyboardType="numeric"
                      value={detailedValues[cat.id] || ''}
                      onChangeText={(v) => updateDetailed(cat.id, v)}
                    />
                  </View>
                ))}
                <View style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: textColor }]}># of Bathrooms</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                    placeholder="1"
                    placeholderTextColor={mutedColor}
                    keyboardType="number-pad"
                    value={bathroomCount}
                    onChangeText={setBathroomCount}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: accentColor }]}
              onPress={handleSaveEstimate}
            >
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Estimate</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </>
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
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 40 },
  modeSwitch: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  modeBtnText: { fontSize: 14, fontWeight: '600' },
  keyboardView: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  totalCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  totalValue: { fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 4 },
  totalSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 16 },
  inputRow: { marginBottom: 14 },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  conditionBtnText: { fontSize: 13, fontWeight: '600' },
  footer: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    backgroundColor: 'transparent',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
