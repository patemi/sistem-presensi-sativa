import { ShiftType } from '../entities/schedule.entity';
export declare class ScheduleItemDto {
    user_id: string;
    date: string;
    shift_type: ShiftType;
}
export declare class BulkCreateScheduleDto {
    schedules?: ScheduleItemDto[];
}
