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
 * 
 * @param lat - Starting latitude in degrees
 * @param lng - Starting longitude in degrees
 * @param heading - Compass heading in degrees (0 = North, 90 = East)
 * @param distance - Distance in meters
 * @returns Target point coordinates
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

  // Calculate new latitude
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  // Calculate new longitude
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
 * Calculate the bearing (heading) from point A to point B.
 * 
 * @param lat1 - Starting latitude
 * @param lng1 - Starting longitude
 * @param lat2 - Target latitude
 * @param lng2 - Target longitude
 * @returns Bearing in degrees (0-360)
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
  
  // Normalize to 0-360
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

/**
 * Calculate the distance between two points using Haversine formula.
 * 
 * @param lat1 - First point latitude
 * @param lng1 - First point longitude
 * @param lat2 - Second point latitude
 * @param lng2 - Second point longitude
 * @returns Distance in meters
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
 * Generate a "scan cone" of points to search for properties.
 * Creates a fan of points extending from the user's position
 * in the direction they're facing.
 * 
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param heading - Compass heading in degrees
 * @param minDistance - Minimum distance to scan (meters)
 * @param maxDistance - Maximum distance to scan (meters)
 * @param coneAngle - Half-angle of the scan cone (degrees)
 * @returns Array of points to check
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
  
  // Distance steps (every 10 meters)
  const distanceStep = 10;
  
  // Angle steps (every 5 degrees within the cone)
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
  
  // Sort by distance from center (closest to heading first)
  points.sort((a, b) => Math.abs(a.angle) - Math.abs(b.angle));
  
  return points;
}

/**
 * Calculate a bounding box around a center point.
 * 
 * @param lat - Center latitude
 * @param lng - Center longitude
 * @param radiusMeters - Radius in meters
 * @returns Bounding box coordinates
 */
export function calculateBoundingBox(
  lat: number,
  lng: number,
  radiusMeters: number
): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  // Approximate degrees per meter
  const latOffset = radiusMeters / 111000;
  const lngOffset = radiusMeters / (111000 * Math.cos(toRadians(lat)));
  
  return {
    minLat: lat - latOffset,
    maxLat: lat + latOffset,
    minLng: lng - lngOffset,
    maxLng: lng + lngOffset,
  };
}

/**
 * Check if a heading falls within a certain angular tolerance.
 * 
 * @param heading - Current heading
 * @param targetHeading - Target heading to compare
 * @param tolerance - Tolerance in degrees
 * @returns True if within tolerance
 */
export function isHeadingWithinTolerance(
  heading: number,
  targetHeading: number,
  tolerance: number
): boolean {
  let diff = Math.abs(heading - targetHeading);
  
  // Handle wrap-around (e.g., 350° vs 10°)
  if (diff > 180) {
    diff = 360 - diff;
  }
  
  return diff <= tolerance;
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

