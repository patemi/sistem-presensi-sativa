import { AttendanceService } from './attendance.service';
import { CheckoutAttendanceDto } from './dto/checkout-attendance.dto';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    checkout(user: any, dto: CheckoutAttendanceDto): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/attendance.entity").Attendance;
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
    getTodayStatus(user: any): Promise<{
        date: string;
        currentTime: string;
        shiftType: import("../schedule/entities/schedule.entity").ShiftType;
        shiftStart: string;
        shiftEnd: string;
        isPastShiftEnd: boolean;
        hasCheckedOut: boolean;
        attendance: import("./entities/attendance.entity").Attendance | null;
        needsCheckoutNotice: boolean;
    }>;
}
