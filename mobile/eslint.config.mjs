/**
 * ESLint flat config for InvestIQ Mobile (Expo / React Native).
 *
 * Mirrors the frontend conventions (single quotes, no-console, etc.)
 * with React Native–specific adjustments.
 */

import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // ── TypeScript files ────────────────────────────────────────
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // ── TypeScript ──────────────────────────────────────────
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-require-imports': 'off', // Babel config uses require

      // ── React hooks ─────────────────────────────────────────
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ── General ─────────────────────────────────────────────
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // ── React Native ────────────────────────────────────────
      // no-restricted-imports can guard against accidental web-only imports
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native-web',
              message: 'This is a native-only project. Do not import from react-native-web.',
            },
          ],
        },
      ],
    },
  },

  // ── Ignore patterns ─────────────────────────────────────────
  {
    ignores: [
      'node_modules/',
      'dist/',
      'android/',
      'ios/',
      '.expo/',
      'babel.config.js',
      'metro.config.js',
      'jest.config.js',
    ],
  },
];
