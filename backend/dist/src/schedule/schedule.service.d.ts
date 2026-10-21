import { Repository, DataSource } from 'typeorm';
import { Schedule, ShiftType } from './entities/schedule.entity';
import { ShiftSwapRequest, ShiftSwapStatus } from './entities/shift-swap-request.entity';
import { ScheduleItemDto } from './dto/create-schedule.dto';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class ScheduleService {
    private readonly scheduleRepo;
    private readonly swapRequestRepo;
    private readonly dataSource;
    private readonly prisma;
    private readonly logger;
    constructor(scheduleRepo: Repository<Schedule>, swapRequestRepo: Repository<ShiftSwapRequest>, dataSource: DataSource, prisma: PrismaService);
    bulkCreate(payload: ScheduleItemDto[] | {
        schedules: ScheduleItemDto[];
    }): Promise<{
        success: boolean;
        message: string;
        count: number;
        schedules: Schedule[];
    }>;
    findAll(filters?: {
        month?: string;
        date?: string;
        user_id?: string;
    }): Promise<{
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
        shift_type: ShiftType;
        created_at: Date;
        updated_at: Date;
    }[]>;
    createSwapRequest(requesterId: string, dto: CreateSwapRequestDto): Promise<{
        success: boolean;
        message: string;
        data: ShiftSwapRequest;
    }>;
    approveSwapByHr(requestId: string): Promise<{
        success: boolean;
        message: string;
        swapRequest: ShiftSwapRequest;
        swappedSchedules: {
            requester_date_now_assigned_to: string;
            target_date_now_assigned_to: string;
        };
    }>;
    rejectSwap(requestId: string, reason?: string): Promise<{
        success: boolean;
        message: string;
        data: ShiftSwapRequest;
    }>;
    findAllSwapRequests(userId?: string): Promise<{
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
        status: ShiftSwapStatus;
        created_at: Date;
        updated_at: Date;
    }[]>;
}
