import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Keyboard,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchPlacePredictionsDebounced,
  getPlaceDetails,
  isPlacesConfigured,
  type PlacePrediction,
} from '@/services/places';
import { useRecentSearches } from '@/hooks/useSearchHistory';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
} from '@/constants/tokens';

export default function SearchModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const { data: recentSearches } = useRecentSearches(8);
  const hasPlaces = isPlacesConfigured();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (!hasPlaces) return;
      setIsSearching(true);
      fetchPlacePredictionsDebounced(text, (results) => {
        setPredictions(results);
        setIsSearching(false);
      });
    },
    [hasPlaces],
  );

  async function handleSelectPrediction(prediction: PlacePrediction) {
    Keyboard.dismiss();
    setIsResolving(true);
    const address =
      (await getPlaceDetails(prediction.place_id)) ?? prediction.description;
    setIsResolving(false);
    navigateToAnalyzing(address);
  }

  function handleSubmitText() {
    const trimmed = query.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    navigateToAnalyzing(trimmed);
  }

  function handleSelectRecent(searchQuery: string) {
    Keyboard.dismiss();
    navigateToAnalyzing(searchQuery);
  }

  function navigateToAnalyzing(address: string) {
    router.replace(`/analyzing?address=${encodeURIComponent(address)}`);
  }

  const showPredictions = hasPlaces && query.length >= 3 && predictions.length > 0;
  const showRecent =
    !showPredictions &&
    query.length < 3 &&
    recentSearches &&
    recentSearches.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Search header ───────────────────────────────── */}
      <View style={styles.searchHeader}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.heading} />
        </Pressable>

        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={18} color={colors.secondary} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Enter a property address..."
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            onSubmitEditing={handleSubmitText}
            autoCorrect={false}
            autoCapitalize="words"
            selectionColor={colors.accent}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery('');
                setPredictions([]);
                inputRef.current?.focus();
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
          {(isSearching || isResolving) && (
            <ActivityIndicator size="small" color={colors.accent} />
          )}
        </View>
      </View>

      {/* ── Autocomplete predictions ────────────────────── */}
      {showPredictions && (
        <FlatList
          data={predictions}
          keyExtractor={(item) => item.place_id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={styles.predictionItem}
              onPress={() => handleSelectPrediction(item)}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={colors.accent}
                style={styles.predictionIcon}
              />
              <View style={styles.predictionText}>
                <Text style={styles.predictionMain} numberOfLines={1}>
                  {item.structured_formatting.main_text}
                </Text>
                <Text style={styles.predictionSecondary} numberOfLines={1}>
                  {item.structured_formatting.secondary_text}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* ── Recent searches ──────────────────────────────── */}
      {showRecent && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
          <FlatList
            data={recentSearches}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.recentItem}
                onPress={() => handleSelectRecent(item.search_query)}
              >
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.secondary}
                  style={styles.predictionIcon}
                />
                <View style={styles.predictionText}>
                  <Text style={styles.recentAddress} numberOfLines={1}>
                    {item.search_query}
                  </Text>
                  {item.result_summary && (
                    <Text style={styles.recentMeta} numberOfLines={1}>
                      {[
                        item.result_summary.bedrooms && `${item.result_summary.bedrooms}bd`,
                        item.result_summary.bathrooms && `${item.result_summary.bathrooms}ba`,
                        item.result_summary.square_footage &&
                          `${item.result_summary.square_footage.toLocaleString()} sqft`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  )}
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.muted} />
              </Pressable>
            )}
          />
        </View>
      )}

      {/* ── Empty state / hint ────────────────────────────── */}
      {!showPredictions && !showRecent && query.length < 3 && (
        <View style={styles.hint}>
          <Ionicons name="search" size={48} color={colors.border} />
          <Text style={styles.hintText}>
            Type at least 3 characters to search
          </Text>
        </View>
      )}

      {/* ── No results ────────────────────────────────────── */}
      {hasPlaces &&
        query.length >= 3 &&
        predictions.length === 0 &&
        !isSearching && (
          <View style={styles.hint}>
            <Ionicons name="location-outline" size={48} color={colors.border} />
            <Text style={styles.hintText}>No addresses found</Text>
            <Pressable style={styles.manualBtn} onPress={handleSubmitText}>
              <Text style={styles.manualBtnText}>Search manually</Text>
            </Pressable>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.heading,
    paddingVertical: 10,
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  predictionIcon: {
    width: 24,
  },
  predictionText: {
    flex: 1,
  },
  predictionMain: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.heading,
  },
  predictionSecondary: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.secondary,
    marginTop: 1,
  },
  recentSection: {
    flex: 1,
    paddingTop: spacing.md,
  },
  recentTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  recentAddress: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.heading,
  },
  recentMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 1,
  },
  hint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: spacing.md,
  },
  hintText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  manualBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  manualBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
});
