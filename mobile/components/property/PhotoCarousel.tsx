import { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_HEIGHT = 260;

interface PhotoCarouselProps {
  photos: string[];
}

export function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  if (!photos || photos.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="image-outline" size={48} color={colors.muted} />
        <Text style={styles.placeholderText}>No photos available</Text>
      </View>
    );
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (index !== activeIndex) setActiveIndex(index);
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={200}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        )}
      />
      {/* Counter */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {activeIndex + 1}/{photos.length}
        </Text>
      </View>
      {/* Dots */}
      {photos.length > 1 && photos.length <= 10 && (
        <View style={styles.dots}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: SCREEN_W,
    height: PHOTO_HEIGHT,
  },
  placeholder: {
    width: SCREEN_W,
    height: PHOTO_HEIGHT,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  placeholderText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  counter: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  counterText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  dots: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: colors.white,
    width: 18,
    borderRadius: 3,
  },
});
