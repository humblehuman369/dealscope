/**
 * Deep link configuration for DealGapIQ mobile app.
 *
 * Supports:
 * - Custom URL scheme: dealgapiq://
 * - Universal Links (iOS): dealgapiq.com/*
 * - App Links (Android): dealgapiq.com/*
 *
 * The app.json scheme + associated domains config handles OS-level
 * registration. This file defines the route mapping for expo-linking.
 */

import { type LinkingOptions } from '@react-navigation/native';

export const URL_SCHEME = 'dealgapiq';
export const WEB_DOMAIN = 'dealgapiq.com';

export const UNIVERSAL_LINK_PREFIXES = [
  `${URL_SCHEME}://`,
  `https://${WEB_DOMAIN}`,
  `https://www.${WEB_DOMAIN}`,
];

/**
 * Route map for deep links.
 * Maps URL paths to Expo Router screen names.
 */
export const DEEP_LINK_ROUTES = {
  property: 'property/[zpid]',
  verdict: 'verdict',
  strategy: 'strategy',
  pricing: 'pricing',
  verifyEmail: '(auth)/verify-email',
  resetPassword: '(auth)/reset-password',
  login: '(auth)/login',
  register: '(auth)/register',
} as const;

/**
 * Linking configuration for React Navigation / Expo Router.
 *
 * Expo Router handles most of this automatically via file-based routing,
 * but this config enables universal link resolution and custom scheme
 * handling when the app is opened from an external URL.
 */
export const linkingConfig: LinkingOptions<object>['config'] = {
  screens: {
    '(auth)/verify-email': 'verify-email',
    '(auth)/reset-password': 'reset-password',
    '(auth)/login': 'login',
    '(auth)/register': 'register',
    verdict: 'verdict',
    strategy: 'strategy',
    pricing: 'pricing',
    'property/[zpid]': 'property/:zpid',
    'deal-maker/[address]': 'deal-maker/:address',
  },
};
