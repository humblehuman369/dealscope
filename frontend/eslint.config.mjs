import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import prettierConfig from 'eslint-config-prettier'

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  // ── Next.js recommended rulesets (flat config, native v16) ──
  ...nextCoreWebVitals,
  ...nextTypescript,

  // ── Prettier — disables formatting rules that conflict ──────
  prettierConfig,

  // ── Project overrides ───────────────────────────────────────
  {
    rules: {
      // ── TypeScript ──────────────────────────────────────────
      // Catch unused vars but allow intentional _ prefixes
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow `any` as warning — too many to fix in one pass
      '@typescript-eslint/no-explicit-any': 'warn',

      // ── React hooks ─────────────────────────────────────────
      // Foundational hook rules — keep as errors
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React Compiler rules (new in eslint-plugin-react-hooks v7,
      // shipped with Next.js 16). The codebase targets React 18
      // which doesn't include the compiler, so many of these are
      // false positives. Downgrade to warnings until React 19 migration.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/unsupported-syntax': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',

      // ── React JSX ───────────────────────────────────────────
      // Unescaped entities — warn only (apostrophes in JSX text)
      'react/no-unescaped-entities': 'warn',

      // ── General ─────────────────────────────────────────────
      // Catch accidental console.log in production code
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // ── Ignore patterns ─────────────────────────────────────────
  {
    ignores: [
      '.next/',
      'node_modules/',
      'out/',
      'coverage/',
      'public/',
    ],
  },
]

export default eslintConfig
