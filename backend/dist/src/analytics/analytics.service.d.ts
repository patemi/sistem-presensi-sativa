import { PrismaService } from '../prisma/prisma.service';
import { CronService } from '../cron/cron.service';
export declare class AnalyticsService {
    private prisma;
    private cronService;
    private readonly logger;
    constructor(prisma: PrismaService, cronService: CronService);
    triggerCron(): Promise<{
        processedDivisions: number;
        aggregatedDivisions: number;
        skippedDivisions: number;
    }>;
    getDailyAttendanceSummary(organizationId: string, divisionId?: string, period?: string): Promise<{
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
    getDivisionWellbeingTrends(organizationId: string, divisionId?: string, period?: string): Promise<any[]>;
    getCorrelationMatrix(organizationId: string, divisionId?: string, period?: string): Promise<any[]>;
    getOrganizationSummary(organizationId: string): Promise<{
        totalEmployees: number;
        totalDivisions: number;
        todayAttendanceCount: number;
        todayAttendanceRate: number;
        divisionsNeedingAttention: number;
        avgOrganizationMood: number;
    }>;
}
