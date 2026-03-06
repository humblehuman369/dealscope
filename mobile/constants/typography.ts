/**
 * Typography scale mirroring frontend verdict-design-tokens.ts
 *
 * Fonts loaded via expo-font in _layout.tsx:
 *   DM Sans      -> headings, CTA
 *   Space Mono   -> financial numbers, data
 *   Source Sans 3 -> body text
 *
 * Until fonts are loaded, the fontFamily keys gracefully fall back to system.
 */

export const fontFamilies = {
  heading: 'DMSans-Bold',
  headingMedium: 'DMSans-Medium',
  body: 'SourceSans3-Regular',
  bodyMedium: 'SourceSans3-SemiBold',
  bodyBold: 'SourceSans3-Bold',
  mono: 'SpaceMono-Regular',
  monoBold: 'SpaceMono-Bold',
} as const;

export const typography = {
  scoreDisplay: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 56,
    fontWeight: '700' as const,
    lineHeight: 56,
  },
  h1: {
    fontFamily: fontFamilies.heading,
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  h2: {
    fontFamily: fontFamilies.heading,
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  h3: {
    fontFamily: fontFamilies.heading,
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  h4: {
    fontFamily: fontFamilies.headingMedium,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 26,
  },
  bodySmall: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  label: {
    fontFamily: fontFamilies.heading,
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  tag: {
    fontFamily: fontFamilies.heading,
    fontSize: 10,
    fontWeight: '700' as const,
    lineHeight: 13,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  financial: {
    fontFamily: fontFamilies.mono,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  financialLarge: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 19,
    fontWeight: '700' as const,
    lineHeight: 25,
  },
  cta: {
    fontFamily: fontFamilies.heading,
    fontSize: 17,
    fontWeight: '700' as const,
    lineHeight: 22,
  },
} as const;
