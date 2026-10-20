import { PrismaService } from '../prisma/prisma.service';
export declare class CheckinService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    checkIn(userId: string, latitude: number, longitude: number): Promise<{
        success: boolean;
        checkinId: string;
        checkInTime: Date;
        lateMinutes: number;
        attendanceStatus: string;
        officeLabel: string;
        distanceMeters: number;
    }>;
    checkOut(userId: string, divisionId: string | null, organizationId: string, latitude: number, longitude: number, moodScore: number, noteText?: string): Promise<{
        success: boolean;
        checkInTime: Date;
        checkOutTime: Date;
        attendanceStatus: string;
        distanceMeters: number;
    }>;
    getTodayStatus(userId: string): Promise<{
        hasCheckedIn: boolean;
        hasCheckedOut: boolean;
        checkin: null;
    } | {
        hasCheckedIn: boolean;
        hasCheckedOut: boolean;
        checkin: {
            id: string;
            checkInTime: Date;
            lateMinutes: number;
            attendanceStatus: string;
            officeLabel: string;
            distanceMeters: number;
            checkOutTime: Date | null;
        };
    }>;
    getMyAttendanceHistory(userId: string): Promise<{
        id: string;
        checkInTime: Date;
        checkOutTime: Date | null;
        lateMinutes: number;
        attendanceStatus: string;
        officeLabel: string;
        distanceMeters: number;
    }[]>;
}
