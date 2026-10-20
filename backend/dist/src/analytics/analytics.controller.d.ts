import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private analyticsService;
    constructor(analyticsService: AnalyticsService);
    triggerCron(): Promise<{
        processedDivisions: number;
        aggregatedDivisions: number;
        skippedDivisions: number;
    }>;
    getAttendanceToday(user: any, divisionId?: string, period?: string): Promise<{
        summary: {
            totalEmployees: number;
            presentCount: number;
            absentCount: number;
            lateCount: number;
            completedCount: number;
            attendanceRate: number;
            lateRate: number;
        };
        presentList: {
            userId: string;
            fullName: string;
            divisionName: string;
            checkInTime: Date;
            checkOutTime: Date | null;
            lateMinutes: number;
            attendanceStatus: string;
            distanceMeters: number;
            officeLabel: string;
        }[];
        absentList: {
            userId: string;
            fullName: string;
            divisionName: string;
        }[];
    }>;
    getDivisionWellbeing(user: any, divisionId?: string, period?: string): Promise<any[]>;
    getCorrelation(user: any, divisionId?: string, period?: string): Promise<any[]>;
    getOrganizationSummary(user: any): Promise<{
        totalEmployees: number;
        totalDivisions: number;
        todayAttendanceCount: number;
        todayAttendanceRate: number;
        divisionsNeedingAttention: number;
        avgOrganizationMood: number;
    }>;
}
