import { ScheduleService } from './schedule.service';
import { ScheduleItemDto } from './dto/create-schedule.dto';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
export declare class ScheduleController {
    private readonly scheduleService;
    constructor(scheduleService: ScheduleService);
    bulkCreate(payload: ScheduleItemDto[] | {
        schedules: ScheduleItemDto[];
    }): Promise<{
        success: boolean;
        message: string;
        count: number;
        schedules: import("./entities/schedule.entity").Schedule[];
    }>;
    getSchedules(month?: string, date?: string, userId?: string): Promise<{
        shift_start: string;
        shift_end: string;
        shift_label: string;
        user_name: string;
        user_email: string;
        user_role: string;
        division_name: string;
        id: string;
        user_id: string;
        date: string;
        shift_type: import("./entities/schedule.entity").ShiftType;
        created_at: Date;
        updated_at: Date;
    }[]>;
    getMySchedules(user: any, month?: string): Promise<{
        shift_start: string;
        shift_end: string;
        shift_label: string;
        user_name: string;
        user_email: string;
        user_role: string;
        division_name: string;
        id: string;
        user_id: string;
        date: string;
        shift_type: import("./entities/schedule.entity").ShiftType;
        created_at: Date;
        updated_at: Date;
    }[]>;
    createSwapRequest(user: any, dto: CreateSwapRequestDto): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/shift-swap-request.entity").ShiftSwapRequest;
    }>;
    getSwapRequests(user: any, all?: string): Promise<{
        requester_name: string;
        requester_email: string;
        target_user_name: string;
        target_user_email: string;
        id: string;
        requester_id: string;
        target_user_id: string;
        requester_date: string;
        target_date: string;
        reason: string;
        status: import("./entities/shift-swap-request.entity").ShiftSwapStatus;
        created_at: Date;
        updated_at: Date;
    }[]>;
    approveSwapByHr(id: string): Promise<{
        success: boolean;
        message: string;
        swapRequest: import("./entities/shift-swap-request.entity").ShiftSwapRequest;
        swappedSchedules: {
            requester_date_now_assigned_to: string;
            target_date_now_assigned_to: string;
        };
    }>;
    rejectSwap(id: string, reason?: string): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/shift-swap-request.entity").ShiftSwapRequest;
    }>;
}
