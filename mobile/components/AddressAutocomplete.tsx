import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { colors, shadows } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { layout } from '@/constants/spacing';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

const AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL =
  'https://maps.googleapis.com/maps/api/place/details/json';

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface AddressComponents {
  city: string;
  state: string;
  zipCode: string;
}

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (formatted: string, components: AddressComponents) => void;
  placeholder?: string;
  editable?: boolean;
  onSubmitEditing?: () => void;
}

function extractComponent(
  result: Record<string, any> | undefined,
  type: string,
  useShortName = false,
): string {
  const comp = result?.address_components?.find((c: any) =>
    c.types?.includes(type),
  );
  return useShortName ? (comp?.short_name ?? '') : (comp?.long_name ?? '');
}

function stripUSA(address: string): string {
  return address.replace(/,\s*USA$/i, '').trim();
}

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder,
  editable = true,
  onSubmitEditing,
}: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suppressRef = useRef(false);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!API_KEY || input.length < 3) {
      setPredictions([]);
      setShowResults(false);
      return;
    }
    try {
      const params = new URLSearchParams({
        input,
        key: API_KEY,
        types: 'address',
        components: 'country:us',
      });
      const res = await fetch(`${AUTOCOMPLETE_URL}?${params}`);
      const json = await res.json();
      if (json.predictions?.length) {
        setPredictions(json.predictions);
        setShowResults(true);
      } else {
        setPredictions([]);
        setShowResults(false);
      }
    } catch {
      setPredictions([]);
      setShowResults(false);
    }
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);
      if (suppressRef.current) {
        suppressRef.current = false;
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchPredictions(text), 300);
    },
    [onChangeText, fetchPredictions],
  );

  const handleSelect = useCallback(
    async (prediction: Prediction) => {
      Keyboard.dismiss();
      setShowResults(false);
      setPredictions([]);
      suppressRef.current = true;

      try {
        const params = new URLSearchParams({
          place_id: prediction.place_id,
          key: API_KEY,
          fields: 'formatted_address,address_components',
        });
        const res = await fetch(`${DETAILS_URL}?${params}`);
        const json = await res.json();
        const result = json.result;
        const formatted = stripUSA(
          result?.formatted_address ?? prediction.description,
        );
        const components: AddressComponents = {
          city:
            extractComponent(result, 'locality') ||
            extractComponent(result, 'sublocality'),
          state: extractComponent(result, 'administrative_area_level_1', true),
          zipCode: extractComponent(result, 'postal_code'),
        };
        onSelect(formatted, components);
      } catch {
        onSelect(stripUSA(prediction.description), {
          city: '',
          state: '',
          zipCode: '',
        });
      }
    },
    [onSelect],
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => setShowResults(false), 200);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        onFocus={() => {
          if (predictions.length > 0) setShowResults(true);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        editable={editable}
        autoCorrect={false}
      />
      {showResults && predictions.length > 0 && (
        <View style={styles.dropdown}>
          {predictions.map((p, i) => (
            <Pressable
              key={p.place_id}
              onPress={() => handleSelect(p)}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
                i === predictions.length - 1 && styles.rowLast,
              ]}
            >
              <Text style={styles.mainText} numberOfLines={1}>
                {p.structured_formatting.main_text}
              </Text>
              <Text style={styles.secondaryText} numberOfLines={1}>
                {p.structured_formatting.secondary_text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  input: {
    height: layout.inputHeight,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: layout.inputRadius,
    paddingHorizontal: 14,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: colors.textHeading,
  },
  dropdown: {
    position: 'absolute',
    top: layout.inputHeight + 4,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: layout.inputRadius,
    overflow: 'hidden',
    zIndex: 20,
    ...shadows.card,
    ...(Platform.OS === 'android' ? { elevation: 10 } : {}),
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.panelHover,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  mainText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 15,
    color: colors.textHeading,
  },
  secondaryText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
