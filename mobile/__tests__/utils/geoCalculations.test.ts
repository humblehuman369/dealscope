/**
 * Unit tests for utils/geoCalculations.ts
 *
 * Covers distance, bearing, scan cone, and coordinate transformations.
 */

import {
  toRadians,
  toDegrees,
  calculateTargetPoint,
  calculateBearing,
  calculateDistance,
  calculateBoundingBox,
  isHeadingWithinTolerance,
  getCardinalDirection,
  generateScanCone,
} from '../../utils/geoCalculations';

// ─── Coordinate conversions ──────────────────────────────────────

describe('toRadians', () => {
  it('converts 180 degrees to π', () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI, 5);
  });

  it('converts 0 degrees to 0', () => {
    expect(toRadians(0)).toBe(0);
  });

  it('converts 90 degrees to π/2', () => {
    expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('toDegrees', () => {
  it('converts π to 180 degrees', () => {
    expect(toDegrees(Math.PI)).toBeCloseTo(180, 5);
  });

  it('converts 0 to 0', () => {
    expect(toDegrees(0)).toBe(0);
  });
});

// ─── Distance calculations ───────────────────────────────────────

describe('calculateDistance', () => {
  it('returns 0 for same point', () => {
    expect(calculateDistance(40, -74, 40, -74)).toBe(0);
  });

  it('calculates known distance (NYC to LA ≈ 3,940 km)', () => {
    const dist = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
    // Should be approximately 3,940,000 meters (±5%)
    expect(dist).toBeGreaterThan(3_700_000);
    expect(dist).toBeLessThan(4_200_000);
  });

  it('returns a positive value regardless of direction', () => {
    const dist = calculateDistance(34.0522, -118.2437, 40.7128, -74.006);
    expect(dist).toBeGreaterThan(0);
  });
});

// ─── Bearing calculations ────────────────────────────────────────

describe('calculateBearing', () => {
  it('returns ~0 for due north', () => {
    const bearing = calculateBearing(40.0, -74.0, 41.0, -74.0);
    expect(bearing).toBeCloseTo(0, 0);
  });

  it('returns ~90 for due east', () => {
    const bearing = calculateBearing(40.0, -74.0, 40.0, -73.0);
    expect(bearing).toBeGreaterThan(80);
    expect(bearing).toBeLessThan(100);
  });

  it('returns ~180 for due south', () => {
    const bearing = calculateBearing(41.0, -74.0, 40.0, -74.0);
    expect(bearing).toBeCloseTo(180, 0);
  });

  it('returns value in [0, 360)', () => {
    const bearing = calculateBearing(40.0, -74.0, 39.0, -75.0);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });
});

// ─── Target point calculation ────────────────────────────────────

describe('calculateTargetPoint', () => {
  it('moves north when heading is 0', () => {
    const result = calculateTargetPoint(40.0, -74.0, 0, 1000);
    expect(result.lat).toBeGreaterThan(40.0);
    expect(result.lng).toBeCloseTo(-74.0, 3);
  });

  it('moves east when heading is 90', () => {
    const result = calculateTargetPoint(40.0, -74.0, 90, 1000);
    expect(result.lat).toBeCloseTo(40.0, 2);
    expect(result.lng).toBeGreaterThan(-74.0);
  });

  it('returns original point at distance 0', () => {
    const result = calculateTargetPoint(40.0, -74.0, 45, 0);
    expect(result.lat).toBeCloseTo(40.0, 5);
    expect(result.lng).toBeCloseTo(-74.0, 5);
  });
});

// ─── Bounding box ────────────────────────────────────────────────

describe('calculateBoundingBox', () => {
  it('returns a box centered on the point', () => {
    const box = calculateBoundingBox(40.0, -74.0, 1000);
    expect(box.minLat).toBeLessThan(40.0);
    expect(box.maxLat).toBeGreaterThan(40.0);
    expect(box.minLng).toBeLessThan(-74.0);
    expect(box.maxLng).toBeGreaterThan(-74.0);
  });

  it('grows with larger radius', () => {
    const small = calculateBoundingBox(40.0, -74.0, 100);
    const large = calculateBoundingBox(40.0, -74.0, 10000);
    expect(large.maxLat - large.minLat).toBeGreaterThan(small.maxLat - small.minLat);
  });
});

// ─── Heading tolerance ───────────────────────────────────────────

describe('isHeadingWithinTolerance', () => {
  it('returns true for exact match', () => {
    expect(isHeadingWithinTolerance(90, 90, 10)).toBe(true);
  });

  it('returns true within tolerance', () => {
    expect(isHeadingWithinTolerance(85, 90, 10)).toBe(true);
  });

  it('returns false outside tolerance', () => {
    expect(isHeadingWithinTolerance(70, 90, 10)).toBe(false);
  });

  it('handles wraparound at 360/0 boundary', () => {
    expect(isHeadingWithinTolerance(355, 5, 15)).toBe(true);
    expect(isHeadingWithinTolerance(5, 355, 15)).toBe(true);
  });
});

// ─── Cardinal directions ─────────────────────────────────────────

describe('getCardinalDirection', () => {
  it('returns N for heading near 0', () => {
    expect(getCardinalDirection(0)).toBe('N');
  });

  it('returns E for heading near 90', () => {
    expect(getCardinalDirection(90)).toBe('E');
  });

  it('returns S for heading near 180', () => {
    expect(getCardinalDirection(180)).toBe('S');
  });

  it('returns W for heading near 270', () => {
    expect(getCardinalDirection(270)).toBe('W');
  });
});

// ─── Scan cone generation ────────────────────────────────────────

describe('generateScanCone', () => {
  it('returns an array of candidate points', () => {
    const cone = generateScanCone(40.0, -74.0, 90);
    expect(Array.isArray(cone)).toBe(true);
    expect(cone.length).toBeGreaterThan(0);
  });

  it('each point has required properties', () => {
    const cone = generateScanCone(40.0, -74.0, 90);
    const point = cone[0];
    expect(point).toHaveProperty('lat');
    expect(point).toHaveProperty('lng');
    expect(point).toHaveProperty('distance');
    expect(point).toHaveProperty('angle');
    expect(point).toHaveProperty('priority');
  });

  it('respects distance constraints', () => {
    const cone = generateScanCone(40.0, -74.0, 90, 10, 100);
    for (const point of cone) {
      expect(point.distance).toBeGreaterThanOrEqual(10);
      expect(point.distance).toBeLessThanOrEqual(100);
    }
  });
});
