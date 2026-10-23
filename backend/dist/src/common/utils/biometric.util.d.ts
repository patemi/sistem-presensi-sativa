export declare const FACE_MATCH_MAX_DISTANCE = 0.5;
export declare const FACE_UNIQUENESS_MIN_DISTANCE = 0.48;
export declare function parseFaceDescriptor(raw: string | number[]): number[];
export declare function calculateEuclideanDistance(vec1: number[], vec2: number[]): number;
export declare function calculateSimilarityPercent(distance: number): number;
