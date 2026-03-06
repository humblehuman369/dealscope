import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { usePropertySearch } from '@/hooks/usePropertyData';
import api from '@/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2;

interface PhotoItem {
  url: string;
  caption?: string;
}

export default function PhotosScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const property = usePropertySearch(address ?? null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchPhotos = useCallback(async (retry = 0) => {
    if (!property.data?.zpid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<any>(
        '/api/v1/photos',
        { params: { zpid: property.data.zpid } },
      );
      const photoList: PhotoItem[] = Array.isArray(data)
        ? data.map((url: string) => ({ url }))
        : Array.isArray(data?.photos)
          ? data.photos
          : [];
      setPhotos(photoList);
    } catch (err) {
      if (retry < 2) {
        setTimeout(() => fetchPhotos(retry + 1), 2000 * (retry + 1));
        setRetryCount(retry + 1);
        return;
      }
      setError('Photos are temporarily unavailable. Try again later.');
    } finally {
      setLoading(false);
    }
  }, [property.data?.zpid]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Button
          title="← Back"
          variant="ghost"
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-start' }}
        />
        <Text style={styles.title}>Property Photos</Text>
        {property.data && (
          <Text style={styles.subtitle}>{property.data.address.street}</Text>
        )}
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          {retryCount > 0 && (
            <Text style={styles.retryText}>Retrying... (attempt {retryCount + 1})</Text>
          )}
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={() => fetchPhotos()} style={{ marginTop: spacing.md }} />
        </View>
      )}

      {!loading && !error && photos.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No photos available for this property.</Text>
        </View>
      )}

      {!loading && photos.length > 0 && (
        <FlatList
          data={photos}
          numColumns={2}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <View style={[styles.photoCard, cardGlow.sm]}>
              <Image source={{ uri: item.url }} style={styles.photo} resizeMode="cover" />
              {item.caption && (
                <Text style={styles.caption} numberOfLines={1}>{item.caption}</Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  header: { paddingHorizontal: spacing.lg, paddingTop: 56 },
  title: { fontFamily: fontFamilies.heading, fontSize: 22, fontWeight: '700', color: colors.textHeading },
  subtitle: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  retryText: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm },
  errorText: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.error, textAlign: 'center' },
  emptyText: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary },
  grid: { padding: spacing.lg },
  gridRow: { gap: spacing.sm },
  photoCard: { width: IMAGE_SIZE, backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden', marginBottom: spacing.sm },
  photo: { width: '100%', height: IMAGE_SIZE * 0.75 },
  caption: { fontFamily: fontFamilies.body, fontSize: 11, color: colors.textSecondary, padding: spacing.xs },
});
