/**
 * Haversine formula — calculates the great-circle distance between
 * two points on a sphere given their latitudes and longitudes.
 *
 * Used for geofencing validation in SATIVA attendance system.
 * Radius hard limit: 100 meters.
 */

const EARTH_RADIUS_METERS = 6_371_000; // Earth's mean radius in meters

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance in meters between two GPS coordinates.
 * @returns Distance in meters (floating point)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Check if a coordinate is within the geofence radius of an office location.
 * Enforces the SATIVA hard limit of 100 meters maximum radius.
 *
 * @returns { distance: number; isWithin: boolean }
 */
export function validateGeofence(
  userLat: number,
  userLon: number,
  officeLat: number,
  officeLon: number,
  radiusMeters: number,
): { distance: number; isWithin: boolean } {
  // Hard limit enforcement: radius cannot exceed 100 meters
  const effectiveRadius = Math.min(radiusMeters, 100);

  const distance = calculateHaversineDistance(userLat, userLon, officeLat, officeLon);

  return {
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
    isWithin: distance <= effectiveRadius,
  };
}
