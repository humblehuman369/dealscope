import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '..')

const FORBIDDEN_HEX = [
  '#000000',
  '#000',
  '#0C1220',
  '#0c1220',
  '#0A1628',
  '#0a1628',
  '#0d1424',
  '#0d1e38',
  '#0b1426',
  '#0b2236',
  '#060d17',
]

const FORBIDDEN_INLINE_RE = new RegExp(
  `background(Color)?:\\s*['"]#(${FORBIDDEN_HEX.map((h) => h.slice(1)).join('|')})['"]`,
  'i',
)

const FORBIDDEN_TAILWIND_RE = new RegExp(
  `bg-\\[#(${FORBIDDEN_HEX.map((h) => h.slice(1)).join('|')})\\]`,
  'i',
)

const FORBIDDEN_DARK_RE = /dark:bg-\[#[0-9a-fA-F]{3,8}\]/

const FORBIDDEN_BG_BLACK_RE = /\bbg-black\b/

const HIGH_CHURN_PAGES = [
  'app/verdict/page.tsx',
  'app/strategy/page.tsx',
  'app/property/[zpid]/page.tsx',
  'app/profile/page.tsx',
  'app/page.tsx',
  'app/admin/page.tsx',
  'app/compare/page.tsx',
  'app/analyzing/page.tsx',
  'app/search-history/page.tsx',
  'app/saved-properties/page.tsx',
  'app/billing/page.tsx',
  'app/help/page.tsx',
  'app/terms/page.tsx',
  'app/privacy/page.tsx',
  'app/price-intel/page.tsx',
  'components/deal-maker/DealMakerPopup.tsx',
  'components/iq-verdict/IQAnalyzingScreen.tsx',
  'components/auth/AuthGuard.tsx',
  'components/auth/AuthModal.tsx',
]

describe('Theme Surface Contract', () => {
  HIGH_CHURN_PAGES.forEach((relPath) => {
    const filePath = path.join(SRC, relPath)

    it(`${relPath} has no hardcoded dark backgrounds`, () => {
      if (!fs.existsSync(filePath)) return

      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      const violations: string[] = []

      lines.forEach((line, i) => {
        const lineNum = i + 1
        if (FORBIDDEN_INLINE_RE.test(line)) {
          violations.push(`  L${lineNum}: inline hex background → ${line.trim()}`)
        }
        if (FORBIDDEN_TAILWIND_RE.test(line)) {
          violations.push(`  L${lineNum}: Tailwind hex background → ${line.trim()}`)
        }
        if (FORBIDDEN_DARK_RE.test(line)) {
          violations.push(`  L${lineNum}: dark:bg-[#hex] → ${line.trim()}`)
        }
        if (FORBIDDEN_BG_BLACK_RE.test(line)) {
          violations.push(`  L${lineNum}: bg-black → ${line.trim()}`)
        }
      })

      expect(violations, `Hardcoded dark backgrounds in ${relPath}:\n${violations.join('\n')}`).toHaveLength(0)
    })
  })
})
