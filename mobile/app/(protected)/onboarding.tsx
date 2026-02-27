import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import {
  useOnboarding,
  TOTAL_STEPS,
  type OnboardingData,
} from '@/hooks/useOnboarding';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
} from '@/constants/tokens';

type IoniconsName = keyof typeof Ionicons.glyphMap;

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner', desc: 'Just getting started' },
  { value: 'intermediate', label: 'Intermediate', desc: '1-5 deals closed' },
  { value: 'advanced', label: 'Advanced', desc: '5-20 deals' },
  { value: 'expert', label: 'Expert', desc: '20+ deals' },
];

const STRATEGY_OPTIONS = [
  { id: 'ltr', label: 'Long-Term Rental', icon: 'home-outline' as IoniconsName },
  { id: 'str', label: 'Short-Term Rental', icon: 'sunny-outline' as IoniconsName },
  { id: 'brrrr', label: 'BRRRR', icon: 'refresh-outline' as IoniconsName },
  { id: 'flip', label: 'Fix & Flip', icon: 'hammer-outline' as IoniconsName },
  { id: 'house_hack', label: 'House Hack', icon: 'people-outline' as IoniconsName },
  { id: 'wholesale', label: 'Wholesale', icon: 'document-text-outline' as IoniconsName },
];

const FINANCING_OPTIONS = [
  { value: 'conventional', label: 'Conventional', desc: '20%+ down' },
  { value: 'fha', label: 'FHA', desc: '3.5% down' },
  { value: 'va', label: 'VA', desc: '0% down' },
  { value: 'cash', label: 'Cash', desc: 'No financing' },
  { value: 'hard_money', label: 'Hard Money', desc: 'Short-term' },
];

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative', desc: 'Stable, lower returns' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced risk/reward' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Higher risk, higher potential' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    step,
    data,
    updateField,
    nextStep,
    prevStep,
    complete,
    isSaving,
    isComplete,
    totalSteps,
  } = useOnboarding();

  if (isComplete) {
    router.replace('/');
    return null;
  }

  function handleSkip() {
    complete();
  }

  function handleNext() {
    if (step === totalSteps - 1) {
      complete();
    } else {
      nextStep();
    }
  }

  function toggleList(key: 'preferred_strategies' | 'target_markets', value: string) {
    const current = data[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateField(key, next);
  }

  const stepTitles = [
    'Your Experience',
    'Preferred Strategies',
    'Financing Style',
    'Investment Goals',
    'Target Markets',
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={styles.stepLabel}>
          Step {step + 1} of {totalSteps}
        </Text>
        <Pressable onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
      <View style={styles.progressBar}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i <= step && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>

      <Text style={styles.title}>{stepTitles[step]}</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 0: Experience */}
        {step === 0 &&
          EXPERIENCE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              desc={opt.desc}
              selected={data.investment_experience === opt.value}
              onPress={() => updateField('investment_experience', opt.value)}
            />
          ))}

        {/* Step 1: Strategies */}
        {step === 1 &&
          STRATEGY_OPTIONS.map((opt) => {
            const active = data.preferred_strategies.includes(opt.id);
            return (
              <Pressable
                key={opt.id}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={() => toggleList('preferred_strategies', opt.id)}
              >
                <Ionicons
                  name={opt.icon}
                  size={22}
                  color={active ? colors.accent : colors.secondary}
                />
                <Text style={[styles.optionLabel, active && { color: colors.accent }]}>
                  {opt.label}
                </Text>
                {active && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                )}
              </Pressable>
            );
          })}

        {/* Step 2: Financing */}
        {step === 2 &&
          FINANCING_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              desc={opt.desc}
              selected={data.financing_type === opt.value}
              onPress={() => updateField('financing_type', opt.value)}
            />
          ))}

        {/* Step 3: Goals (Risk) */}
        {step === 3 &&
          RISK_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              desc={opt.desc}
              selected={data.risk_tolerance === opt.value}
              onPress={() => updateField('risk_tolerance', opt.value)}
            />
          ))}

        {/* Step 4: Markets */}
        {step === 4 && (
          <View style={styles.stateGrid}>
            {US_STATES.map((st) => {
              const active = data.target_markets.includes(st);
              return (
                <Pressable
                  key={st}
                  style={[styles.stateChip, active && styles.stateChipActive]}
                  onPress={() => toggleList('target_markets', st)}
                >
                  <Text
                    style={[
                      styles.stateText,
                      active && { color: colors.accent, fontFamily: fontFamily.bold },
                    ]}
                  >
                    {st}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Footer nav */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {step > 0 ? (
          <Button title="Back" variant="ghost" onPress={prevStep} />
        ) : (
          <View />
        )}
        <Button
          title={step === totalSteps - 1 ? 'Finish' : 'Continue'}
          onPress={handleNext}
          loading={isSaving}
        />
      </View>
    </View>
  );
}

function OptionCard({
  label,
  desc,
  selected,
  onPress,
}: {
  label: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.optionCard, selected && styles.optionCardActive]}
      onPress={onPress}
    >
      <View style={styles.optionText}>
        <Text
          style={[styles.optionLabel, selected && { color: colors.accent }]}
        >
          {label}
        </Text>
        <Text style={styles.optionDesc}>{desc}</Text>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.accent : colors.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    paddingHorizontal: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stepLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  skipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xl,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressSegmentActive: {
    backgroundColor: colors.accent,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: colors.heading,
    marginBottom: spacing.lg,
  },
  scroll: { flex: 1 },
  scrollContent: { gap: spacing.sm, paddingBottom: spacing.md },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
  },
  optionText: { flex: 1 },
  optionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.heading,
  },
  optionDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  stateChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  stateText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
