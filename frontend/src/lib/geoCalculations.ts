/**
 * Geographic calculation utilities for property scanning.
 * Uses Haversine formula and bearing calculations.
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Convert degrees to radians.
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees.
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate the GPS coordinates of a point at a given distance and bearing
 * from a starting position using the Haversine formula.
 */
export function calculateTargetPoint(
  lat: number,
  lng: number,
  heading: number,
  distance: number
): { lat: number; lng: number } {
  const φ1 = toRadians(lat);
  const λ1 = toRadians(lng);
  const θ = toRadians(heading);
  const δ = distance / EARTH_RADIUS_METERS;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    lat: toDegrees(φ2),
    lng: toDegrees(λ2),
  };
}

/**
 * Calculate the distance between two points using Haversine formula.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lng2 - lng1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate bearing from point A to point B.
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lng2 - lng1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

/**
 * Generate a scan cone of points to search for properties.
 */
export function generateScanCone(
  userLat: number,
  userLng: number,
  heading: number,
  minDistance: number = 10,
  maxDistance: number = 100,
  coneAngle: number = 20
): Array<{ lat: number; lng: number; distance: number; angle: number }> {
  const points: Array<{ lat: number; lng: number; distance: number; angle: number }> = [];
  const distanceStep = 10;
  const angleStep = 5;
  
  for (let d = minDistance; d <= maxDistance; d += distanceStep) {
    for (let angle = -coneAngle; angle <= coneAngle; angle += angleStep) {
      const adjustedHeading = (heading + angle + 360) % 360;
      const point = calculateTargetPoint(userLat, userLng, adjustedHeading, d);
      
      points.push({
        ...point,
        distance: d,
        angle,
      });
    }
  }
  
  points.sort((a, b) => Math.abs(a.angle) - Math.abs(b.angle));
  return points;
}

/**
 * Get cardinal direction from heading.
 */
export function getCardinalDirection(heading: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(heading / 22.5) % 16;
  return directions[index];
}

/**
 * Format distance for display.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

