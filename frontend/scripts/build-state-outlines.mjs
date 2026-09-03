#!/usr/bin/env node
/**
 * Generates src/lib/geo/state-outlines.json from us-atlas (Census cartographic
 * boundaries, ISC licence). Run once and commit the output; the packages it
 * needs are devDependencies only and never ship to the browser.
 *
 *   node scripts/build-state-outlines.mjs
 *
 * Output shape:
 *   { us: { viewBox }, states: { [uspsCode]: { path, viewBox } } }
 *
 * Geometry is pre-projected with d3.geoAlbersUsa to a 975x610 viewport
 * (Alaska and Hawaii are inset), so the hub map inlines every state with the
 * `us` viewBox and a state page inlines one path with its own viewBox.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import * as topojson from 'topojson-client'
import { presimplify, quantile, simplify } from 'topojson-simplify'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../src/lib/geo/state-outlines.json')

// Keep this fraction of the points. Lower = smaller file, coarser coastline.
const KEEP_POINTS = 0.4
// The hub inlines all 51 paths, so the whole file has a hard budget.
const MAX_BYTES = 60 * 1024

const FIPS_TO_USPS = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT',
  '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL',
  '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD',
  '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE',
  '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV',
  '55': 'WI', '56': 'WY',
}

const raw = JSON.parse(readFileSync(require.resolve('us-atlas/states-albers-10m.json'), 'utf8'))
// topojson-simplify's quantile() sorts weights descending, so passing the keep
// fraction directly yields the weight at which that share of points survives.
const weighted = presimplify(raw)
const topo = simplify(weighted, quantile(weighted, KEEP_POINTS))
const features = topojson.feature(topo, topo.objects.states).features

const round = (n) => Math.round(n * 10) / 10

function ringToPath(ring) {
  // Drop consecutive duplicates that rounding produces.
  const pts = []
  for (const [x, y] of ring) {
    const p = [round(x), round(y)]
    const last = pts[pts.length - 1]
    if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p)
  }
  if (pts.length < 3) return ''
  return `M${pts.map(([x, y]) => `${x} ${y}`).join('L')}Z`
}

function geometryToPath(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.flatMap((poly) => poly.map(ringToPath)).filter(Boolean).join('')
}

function bbox(geometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  for (const poly of polygons) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  const pad = Math.max(maxX - minX, maxY - minY) * 0.04
  return [round(minX - pad), round(minY - pad), round(maxX - minX + pad * 2), round(maxY - minY + pad * 2)]
    .join(' ')
}

const states = {}
for (const f of features) {
  const code = FIPS_TO_USPS[f.id]
  if (!code) continue // territories
  states[code] = { path: geometryToPath(f.geometry), viewBox: bbox(f.geometry) }
}

const missing = Object.values(FIPS_TO_USPS).filter((c) => !states[c])
if (missing.length) {
  console.error(`Missing geometry for: ${missing.join(', ')}`)
  process.exit(1)
}

const out = {
  source: 'us-atlas states-albers-10m (US Census cartographic boundaries), d3.geoAlbersUsa 975x610',
  us: { viewBox: '0 0 975 610' },
  states,
}

const json = JSON.stringify(out)
if (json.length > MAX_BYTES) {
  console.error(`state-outlines.json is ${json.length} bytes; budget is ${MAX_BYTES}. Lower KEEP_POINTS.`)
  process.exit(1)
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, json + '\n')
process.stdout.write(`Wrote ${OUT} (${json.length} bytes, ${Object.keys(states).length} states)\n`)
