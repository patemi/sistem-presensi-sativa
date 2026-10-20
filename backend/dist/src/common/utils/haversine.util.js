"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHaversineDistance = calculateHaversineDistance;
exports.validateGeofence = validateGeofence;
const EARTH_RADIUS_METERS = 6_371_000;
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
function validateGeofence(userLat, userLon, officeLat, officeLon, radiusMeters) {
    const effectiveRadius = Math.min(radiusMeters, 100);
    const distance = calculateHaversineDistance(userLat, userLon, officeLat, officeLon);
    return {
        distance: Math.round(distance * 100) / 100,
        isWithin: distance <= effectiveRadius,
    };
}
//# sourceMappingURL=haversine.util.js.map