export declare const CLINIC_LOCATION: {
    name: string;
    latitude: number;
    longitude: number;
    maxRadiusMeters: number;
};
export declare function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
export declare function validateGeofence(userLat: number, userLon: number, officeLat?: number, officeLon?: number, radiusMeters?: number): {
    distance: number;
    isWithin: boolean;
};
export declare function updateClinicCoordinates(lat: number, lng: number, radius?: number): {
    name: string;
    latitude: number;
    longitude: number;
    maxRadiusMeters: number;
};
