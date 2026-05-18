#!/usr/bin/env node
/**
 * Cross-check: client estimateIncomeValue vs frozen backend golden (run pytest to refresh).
 * CI: node scripts/valuation-parity-check.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { estimateIncomeValue } from '../frontend/src/utils/estimateIncomeValue.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const goldenPath = join(__dirname, '../backend/tests/golden/valuation_ltr_standard.json')

const golden = JSON.parse(readFileSync(goldenPath, 'utf8'))
const clientIv = estimateIncomeValue(golden.clientParams)
const backendIv = golden.expectedIncomeValue

const diff = Math.abs(clientIv - backendIv)
if (diff > 1) {
  console.error(`Parity failed: client=${clientIv} backend=${backendIv} diff=${diff}`)
  process.exit(1)
}
console.log(`Parity OK: income_value=${clientIv}`)
