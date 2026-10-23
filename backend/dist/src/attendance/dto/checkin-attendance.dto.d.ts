export declare class CheckInAttendanceDto {
    latitude: number;
    longitude: number;
    date?: string;
    check_in_time?: string;
    face_verified?: boolean;
    matching_score?: number;
    face_descriptor?: number[] | string;
}
