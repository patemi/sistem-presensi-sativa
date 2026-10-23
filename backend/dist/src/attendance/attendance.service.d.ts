import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Schedule, ShiftType } from '../schedule/entities/schedule.entity';
import { CheckoutAttendanceDto } from './dto/checkout-attendance.dto';
import { CheckInAttendanceDto } from './dto/checkin-attendance.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class AttendanceService {
    private readonly attendanceRepo;
    private readonly scheduleRepo;
    private readonly prisma;
    private readonly logger;
    constructor(attendanceRepo: Repository<Attendance>, scheduleRepo: Repository<Schedule>, prisma: PrismaService);
    private formatDateStr;
    checkIn(userId: string, dto: CheckInAttendanceDto): Promise<{
        success: boolean;
        status: string;
        message: string;
        attendance: Attendance;
        schedule: Schedule | {
            date: string;
            target_check_in: string;
            target_check_out: string;
        };
        target_check_in: string;
        target_check_out: string;
        can_checkout: boolean;
    }>;
    checkout(userId: string, dto: CheckoutAttendanceDto): Promise<{
        success: boolean;
        message: string;
        data: Attendance;
        summary: {
            date: string;
            shift_type: string;
            shift_label: string;
            shift_end: string;
            check_out_time: Date;
            overtime_minutes: number;
            is_overtime: boolean;
            mental_health_log: string;
        };
    }>;
    getTodayStatus(userId: string): Promise<{
        date: string;
        currentTime: string;
        shiftType: ShiftType;
        shiftStart: string;
        shiftEnd: string;
        isPastShiftEnd: boolean;
        hasCheckedOut: boolean;
        attendance: Attendance | null;
        needsCheckoutNotice: boolean;
    }>;
    calibrateClinicLocation(latitude: number, longitude: number, radiusMeters?: number): Promise<{
        success: boolean;
        message: string;
        location: {
            name: string;
            latitude: number;
            longitude: number;
            maxRadiusMeters: number;
        };
    }>;
    getClinicLocation(): {
        name: string;
        latitude: number;
        longitude: number;
        maxRadiusMeters: number;
    };
}
