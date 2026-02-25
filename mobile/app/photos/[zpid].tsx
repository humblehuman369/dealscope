/**
 * Photo Gallery Screen
 * Route: /photos/[zpid]
 *
 * Displays property photos in a grid with full-screen lightbox.
 */

import { ScreenErrorFallback as ErrorBoundary } from '../../components/ScreenErrorFallback';
export { ErrorBoundary };

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
  Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { api } from '../../services/apiClient';
import { useTheme } from '../../context/ThemeContext';
import { usePropertyStore } from '../../stores';
import { isValidZpid, InvalidParamFallback } from '../../hooks/useValidatedParams';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 8;
const COLS = 2;
const THUMB_SIZE = (SCREEN_WIDTH - 24 - GRID_GAP) / COLS;

interface PhotoItem {
  url: string;
  caption?: string;
}

interface PhotosResponse {
  success: boolean;
  photos: PhotoItem[];
  total_count: number;
}

export default function PhotosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const params = useLocalSearchParams<{ zpid: string; address?: string }>();
  const zpidFromRoute = params.zpid || '';
  const addressFromParams = params.address ? decodeURIComponent(params.address) : '';

  const storeZpid = usePropertyStore((s) => s.currentProperty?.zpid);
  const storeAddress = usePropertyStore((s) => s.currentProperty?.address);

  const zpid = zpidFromRoute || storeZpid || '';
  const address = addressFromParams || storeAddress || '';

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!zpid) {
      setError('No property ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<PhotosResponse>('/api/v1/photos', { zpid });
      if (data.success && data.photos) {
        setPhotos(data.photos);
        setTotalCount(data.total_count ?? data.photos.length);
      } else {
        setPhotos([]);
        setTotalCount(0);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load photos';
      setError(message);
      setPhotos([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [zpid]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleBack = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const openLightbox = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLightboxIndex(null);
  }, []);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null || lightboxIndex <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLightboxIndex((i) => (i ?? 0) - 1);
  }, [lightboxIndex]);

  const goNext = useCallback(() => {
    if (lightboxIndex === null || lightboxIndex >= photos.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLightboxIndex((i) => (i ?? 0) + 1);
  }, [lightboxIndex, photos.length]);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  const renderThumb = ({ item, index }: { item: PhotoItem; index: number }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => openLightbox(index)}
      style={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor,
      }}
    >
      <Image
        source={{ uri: item.url }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  if (!isValidZpid(zpid)) return <InvalidParamFallback message="Property not found" />;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor,
          }}
        >
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ padding: 4, marginRight: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: textColor }} numberOfLines={1}>
              {address || 'Property Photos'}
            </Text>
            <Text style={{ fontSize: 13, color: mutedColor, marginTop: 2 }}>
              {totalCount} photo{totalCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={{ marginTop: 12, fontSize: 15, color: mutedColor }}>
              Loading photos...
            </Text>
          </View>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Ionicons name="images-outline" size={56} color={mutedColor} />
            <Text style={{ fontSize: 17, fontWeight: '600', color: textColor, marginTop: 16, textAlign: 'center' }}>
              Unable to load photos
            </Text>
            <Text style={{ fontSize: 14, color: mutedColor, marginTop: 8, textAlign: 'center' }}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={fetchPhotos}
              style={{
                marginTop: 20,
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: accentColor,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : photos.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Ionicons name="images-outline" size={56} color={mutedColor} />
            <Text style={{ fontSize: 17, fontWeight: '600', color: textColor, marginTop: 16 }}>
              No photos available
            </Text>
            <Text style={{ fontSize: 14, color: mutedColor, marginTop: 8, textAlign: 'center' }}>
              Photos for this property are not available yet.
            </Text>
          </View>
        ) : (
          <FlashList
            data={photos}
            renderItem={renderThumb}
            estimatedItemSize={THUMB_SIZE + 24}
            keyExtractor={(item, i) => item.url + String(i)}
            numColumns={COLS}
            contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }}
          />
        )}

        {/* Lightbox Modal */}
        <Modal
          visible={lightboxIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={closeLightbox}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
            <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom, flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <TouchableOpacity onPress={goPrev} style={{ padding: 8 }}>
                  <Ionicons
                    name="chevron-back"
                    size={28}
                    color={lightboxIndex !== null && lightboxIndex > 0 ? '#fff' : 'rgba(255,255,255,0.3)'}
                  />
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontSize: 14 }}>
                  {lightboxIndex !== null ? `${lightboxIndex + 1} / ${photos.length}` : ''}
                </Text>
                <TouchableOpacity onPress={goNext} style={{ padding: 8 }}>
                  <Ionicons
                    name="chevron-forward"
                    size={28}
                    color={
                      lightboxIndex !== null && lightboxIndex < photos.length - 1
                        ? '#fff'
                        : 'rgba(255,255,255,0.3)'
                    }
                  />
                </TouchableOpacity>
              </View>
              <Pressable style={{ flex: 1 }} onPress={closeLightbox}>
                {currentPhoto && (
                  <Image
                    source={{ uri: currentPhoto.url }}
                    style={{ flex: 1, width: '100%' }}
                    resizeMode="contain"
                  />
                )}
              </Pressable>
              <TouchableOpacity
                onPress={closeLightbox}
                style={{
                  position: 'absolute',
                  top: insets.top + 8,
                  right: 16,
                  padding: 8,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 20,
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}
