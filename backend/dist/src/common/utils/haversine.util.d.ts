export declare function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
export declare function validateGeofence(userLat: number, userLon: number, officeLat: number, officeLon: number, radiusMeters: number): {
    distance: number;
    isWithin: boolean;
};
