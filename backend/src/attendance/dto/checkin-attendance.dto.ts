export class CheckInAttendanceDto {
  latitude: number;
  longitude: number;
  date?: string; // 'YYYY-MM-DD'
  check_in_time?: string; // ISO string
  face_verified?: boolean; // Hasil pencocokan face-api.js (>90% mirip)
  matching_score?: number; // Nilai kemiripan wajah (0-100)
  face_descriptor?: number[] | string; // 128-d vector live dari kamera
}
