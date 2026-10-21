import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Schedule, ShiftType } from '../schedule/entities/schedule.entity';
import { CheckoutAttendanceDto } from './dto/checkout-attendance.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class AttendanceService {
    private readonly attendanceRepo;
    private readonly scheduleRepo;
    private readonly prisma;
    private readonly logger;
    constructor(attendanceRepo: Repository<Attendance>, scheduleRepo: Repository<Schedule>, prisma: PrismaService);
    private formatDateStr;
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
}
