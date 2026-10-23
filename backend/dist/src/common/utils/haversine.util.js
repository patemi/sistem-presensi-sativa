"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLINIC_LOCATION = void 0;
exports.calculateHaversineDistance = calculateHaversineDistance;
exports.validateGeofence = validateGeofence;
exports.updateClinicCoordinates = updateClinicCoordinates;
const EARTH_RADIUS_METERS = 6_371_000;
exports.CLINIC_LOCATION = {
    name: 'Orella Aesthetic Clinic',
    latitude: -7.5603728,
    longitude: 110.7666546,
    maxRadiusMeters: 25.0,
};
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
}
function validateGeofence(userLat, userLon, officeLat = exports.CLINIC_LOCATION.latitude, officeLon = exports.CLINIC_LOCATION.longitude, radiusMeters = exports.CLINIC_LOCATION.maxRadiusMeters) {
    const distance = calculateHaversineDistance(userLat, userLon, officeLat, officeLon);
    return {
        distance: Math.round(distance * 100) / 100,
        isWithin: distance < radiusMeters,
    };
}
function updateClinicCoordinates(lat, lng, radius) {
    exports.CLINIC_LOCATION.latitude = lat;
    exports.CLINIC_LOCATION.longitude = lng;
    if (radius)
        exports.CLINIC_LOCATION.maxRadiusMeters = radius;
    return exports.CLINIC_LOCATION;
}
//# sourceMappingURL=haversine.util.js.map