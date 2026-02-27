module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)/|expo(nent)?/|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/.*|posthog-react-native|react-native-purchases|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-svg|expo-.*)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@dealscope/shared$': '<rootDir>/../shared/src/index.ts',
    '^@dealscope/shared/(.*)$': '<rootDir>/../shared/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/__mocks__/', '/setup\\.ts$'],
  collectCoverageFrom: [
    'services/**/*.ts',
    'hooks/**/*.ts',
    'utils/**/*.ts',
    'components/**/*.tsx',
  ],
};
