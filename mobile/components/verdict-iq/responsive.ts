/**
 * Responsive Utilities - Decision-Grade UI
 * Dynamic font and spacing scaling based on screen dimensions
 */

import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Scale factor based on screen width
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;

// Use average for more balanced scaling
const scale = (widthScale + heightScale) / 2;

/**
 * Responsive font size
 * Scales font size based on screen dimensions with min/max bounds
 */
export function rf(size: number, minScale = 0.8, maxScale = 1.3): number {
  const scaledSize = size * Math.min(Math.max(widthScale, minScale), maxScale);
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
}

/**
 * Responsive spacing
 * Scales spacing/padding/margin based on screen dimensions
 */
export function rs(size: number, minScale = 0.85, maxScale = 1.2): number {
  const scaledSize = size * Math.min(Math.max(widthScale, minScale), maxScale);
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
}

/**
 * Responsive width percentage
 * Returns a width value as percentage of screen width
 */
export function rw(percentage: number): number {
  return Math.round((SCREEN_WIDTH * percentage) / 100);
}

/**
 * Responsive height percentage
 * Returns a height value as percentage of screen height
 */
export function rh(percentage: number): number {
  return Math.round((SCREEN_HEIGHT * percentage) / 100);
}

/**
 * Check if device is a small screen (iPhone SE, etc.)
 */
export const isSmallScreen = SCREEN_WIDTH < 375;

/**
 * Check if device is a large screen (iPhone Pro Max, tablets)
 */
export const isLargeScreen = SCREEN_WIDTH >= 428;

/**
 * Screen dimensions
 */
export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;
