/**
 * Haversine formula — calculates the great-circle distance between
 * two points on a sphere given their latitudes and longitudes.
 *
 * Used for geofencing validation in SATIVA attendance system.
 */

const EARTH_RADIUS_METERS = 6_371_000; // Earth's mean radius in meters

/**
 * KONSTANTA LOKASI KLINIK (Google Maps: https://maps.app.goo.gl/9PQWdWuxfPwVrzbRA)
 * Lokasi: Orella Aesthetic Clinic
 * Batas radius maksimal absen: Kurang dari 1 meter (< 1.0 m)
 */
export const CLINIC_LOCATION = {
  name: 'Orella Aesthetic Clinic',
  latitude: -7.5603728,
  longitude: 110.7666546,
  maxRadiusMeters: 25.0, // Disesuaikan menjadi 25 meter agar mencakup seluruh area gedung klinik & toleransi deviasi GPS indoor (12m)
};

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance in meters between two GPS coordinates using Haversine formula.
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
 * Check if a coordinate is within the geofence radius.
 * Batas radius ketat < 1 meter (< 1.0).
 *
 * @returns { distance: number; isWithin: boolean }
 */
export function validateGeofence(
  userLat: number,
  userLon: number,
  officeLat: number = CLINIC_LOCATION.latitude,
  officeLon: number = CLINIC_LOCATION.longitude,
  radiusMeters: number = CLINIC_LOCATION.maxRadiusMeters,
): { distance: number; isWithin: boolean } {
  const distance = calculateHaversineDistance(userLat, userLon, officeLat, officeLon);

  return {
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
    isWithin: distance < radiusMeters,
  };
}

export function updateClinicCoordinates(lat: number, lng: number, radius?: number) {
  CLINIC_LOCATION.latitude = lat;
  CLINIC_LOCATION.longitude = lng;
  if (radius) CLINIC_LOCATION.maxRadiusMeters = radius;
  return CLINIC_LOCATION;
}

