import { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  useInvestorProfile,
  useUpdateInvestorProfile,
  type InvestorProfile,
} from '@/hooks/useProfileData';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
const RISK_LEVELS = ['conservative', 'moderate', 'aggressive'] as const;
const STRATEGIES = [
  { id: 'ltr', label: 'Long-Term Rental' },
  { id: 'str', label: 'Short-Term Rental' },
  { id: 'brrrr', label: 'BRRRR' },
  { id: 'flip', label: 'Fix & Flip' },
  { id: 'house_hack', label: 'House Hack' },
  { id: 'wholesale', label: 'Wholesale' },
];

export function InvestorTab() {
  const { data: profile, isLoading } = useInvestorProfile();
  const updateMutation = useUpdateInvestorProfile();
  const [error, setError] = useState('');

  const [experience, setExperience] = useState(profile?.investment_experience ?? 'beginner');
  const [strategies, setStrategies] = useState<string[]>(profile?.preferred_strategies ?? []);
  const [risk, setRisk] = useState(profile?.risk_tolerance ?? 'moderate');

  useEffect(() => {
    if (profile) {
      setExperience(profile.investment_experience ?? 'beginner');
      setStrategies(profile.preferred_strategies ?? []);
      setRisk(profile.risk_tolerance ?? 'moderate');
    }
  }, [profile]);

  function toggleStrategy(id: string) {
    setStrategies((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    setError('');
    try {
      await updateMutation.mutateAsync({
        investment_experience: experience,
        preferred_strategies: strategies,
        risk_tolerance: risk,
      });
      Alert.alert('Saved', 'Investor profile updated.');
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    }
  }

  if (isLoading) return null;

  return (
    <View style={styles.container}>
      {error ? <ErrorBanner message={error} /> : null}

      {/* Experience */}
      <Text style={styles.label}>Investment Experience</Text>
      <View style={styles.pillRow}>
        {EXPERIENCE_LEVELS.map((lvl) => (
          <Pressable
            key={lvl}
            style={[styles.pill, experience === lvl && styles.pillActive]}
            onPress={() => setExperience(lvl)}
          >
            <Text style={[styles.pillText, experience === lvl && styles.pillTextActive]}>
              {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Strategies */}
      <Text style={styles.label}>Preferred Strategies</Text>
      <View style={styles.chipGrid}>
        {STRATEGIES.map((s) => {
          const active = strategies.includes(s.id);
          return (
            <Pressable
              key={s.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleStrategy(s.id)}
            >
              <Ionicons
                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={active ? colors.accent : colors.muted}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Risk */}
      <Text style={styles.label}>Risk Tolerance</Text>
      <View style={styles.pillRow}>
        {RISK_LEVELS.map((lvl) => (
          <Pressable
            key={lvl}
            style={[styles.pill, risk === lvl && styles.pillActive]}
            onPress={() => setRisk(lvl)}
          >
            <Text style={[styles.pillText, risk === lvl && styles.pillTextActive]}>
              {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button
        title="Save Investor Profile"
        onPress={handleSave}
        loading={updateMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.heading,
    marginTop: spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  pillActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
  },
  pillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  pillTextActive: {
    color: colors.accent,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  chipText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  chipTextActive: {
    color: colors.accent,
    fontFamily: fontFamily.medium,
  },
});
