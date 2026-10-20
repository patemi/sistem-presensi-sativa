import { CheckinService } from './checkin.service';
export declare class CheckinController {
    private checkinService;
    constructor(checkinService: CheckinService);
    createCheckin(user: any, body: {
        latitude: number;
        longitude: number;
    }): Promise<{
        success: boolean;
        checkinId: string;
        checkInTime: Date;
        lateMinutes: number;
        attendanceStatus: string;
        officeLabel: string;
        distanceMeters: number;
    }>;
    createCheckout(user: any, body: {
        latitude: number;
        longitude: number;
        moodScore: number;
        noteText?: string;
    }): Promise<{
        success: boolean;
        checkInTime: Date;
        checkOutTime: Date;
        attendanceStatus: string;
        distanceMeters: number;
    }>;
    getTodayStatus(user: any): Promise<{
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
    getMyHistory(user: any): Promise<{
        id: string;
        checkInTime: Date;
        checkOutTime: Date | null;
        lateMinutes: number;
        attendanceStatus: string;
        officeLabel: string;
        distanceMeters: number;
    }[]>;
}
